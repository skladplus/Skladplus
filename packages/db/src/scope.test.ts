import { describe, expect, it } from 'vitest'
import { AccountScope, forAccount, ResourceNotFoundError } from './scope'

/**
 * Шаблон контрактного теста на разграничение клиентов. Каждая доменная таблица,
 * которая появится позже, обязана получить свою версию этого набора: доступ
 * к чужим заказам — риск номер один в мультиклиентской системе, и ловится он
 * только тестом, который специально пытается его получить.
 */

const A = 'account-a'
const B = 'account-b'

const orderOfA = { id: 'order-1', accountId: A }

describe('AccountScope', () => {
  it('не создаётся без accountId — запрос без него вернул бы чужие данные', () => {
    expect(() => new AccountScope('')).toThrow(/accountId обязателен/)
  })

  it('всегда отдаёт фильтр по своему клиенту', () => {
    expect(forAccount(A).where).toEqual({ accountId: A })
  })

  it('клиент B получает 404 на объект клиента A', () => {
    expect(() => forAccount(B).requireOwned(orderOfA)).toThrow(ResourceNotFoundError)
  })

  it('на чужой объект отвечает 404, а не 403: 403 подтвердил бы, что объект есть', () => {
    try {
      forAccount(B).requireOwned(orderOfA)
      expect.unreachable('должно было выбросить')
    } catch (error) {
      expect((error as ResourceNotFoundError).status).toBe(404)
    }
  })

  it('несуществующий объект неотличим от чужого', () => {
    expect(() => forAccount(A).requireOwned(null)).toThrow(ResourceNotFoundError)
  })

  it('свой объект возвращается как есть', () => {
    expect(forAccount(A).requireOwned(orderOfA)).toBe(orderOfA)
  })

  it('из списка остаётся только своё', () => {
    const mixed = [orderOfA, { id: 'order-2', accountId: B }]
    expect(forAccount(A).filterOwned(mixed)).toEqual([orderOfA])
    expect(forAccount(B).filterOwned(mixed)).toHaveLength(1)
  })
})
