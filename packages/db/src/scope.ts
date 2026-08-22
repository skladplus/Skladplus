import { unsafePrisma } from './client'
import type { PrismaClient } from './generated/client'

export type AccountId = string

/** Всё, что принадлежит клиенту-бизнесу, обязано нести accountId. */
export interface OwnedByAccount {
  readonly accountId: AccountId
}

/**
 * Отдаётся наружу как 404, а не 403. 403 подтверждает, что объект существует, —
 * по такому ответу чужие номера заказов перебираются влёт.
 */
export class ResourceNotFoundError extends Error {
  readonly status = 404

  constructor() {
    super('Ресурс не найден')
    this.name = 'ResourceNotFoundError'
  }
}

/**
 * Единственный разрешённый вход к данным клиента. Смысл не в удобстве,
 * а в том, что фильтр по accountId нельзя забыть: он не аргумент запроса,
 * а свойство объекта, через который запрос вообще делается.
 *
 * Механизм обходится прямым вызовом unsafePrisma() — это признано в
 * docs/02-architecture.md. Он не заменяет ревью, он убирает случайную ошибку
 * и держит доступ в одном месте.
 */
export class AccountScope {
  readonly accountId: AccountId

  constructor(accountId: AccountId) {
    if (!accountId) {
      throw new Error('accountId обязателен: запрос без него вернул бы чужие данные')
    }
    this.accountId = accountId
  }

  /** Фильтр, который обязан присутствовать в каждом запросе к данным клиента. */
  get where(): { accountId: AccountId } {
    return { accountId: this.accountId }
  }

  get db(): PrismaClient {
    return unsafePrisma()
  }

  /**
   * Проверка владения после чтения. Нужна там, где объект достали по одному
   * первичному ключу: findUnique не принимает accountId в where.
   */
  requireOwned<T extends OwnedByAccount>(entity: T | null | undefined): T {
    if (!entity || entity.accountId !== this.accountId) {
      throw new ResourceNotFoundError()
    }
    return entity
  }

  /** То же для списков: чужое молча отбрасывается, а не роняет ответ. */
  filterOwned<T extends OwnedByAccount>(entities: readonly T[]): T[] {
    return entities.filter((entity) => entity.accountId === this.accountId)
  }
}

export function forAccount(accountId: AccountId): AccountScope {
  return new AccountScope(accountId)
}
