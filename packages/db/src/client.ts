import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/client'

/**
 * Prisma 7 подключается через driver adapter, а не через строку в схеме.
 * DATABASE_URL — пул. Миграции ходят по DIRECT_URL и настроены
 * в prisma.config.ts: pooled-соединение их не переживёт.
 *
 * Клиент создаётся лениво. Создание на импорте потребовало бы DATABASE_URL
 * во время `next build` и в юнит-тестах, где база не нужна.
 *
 * Функция называется unsafe не для красоты: она возвращает клиент без фильтра
 * по клиенту-владельцу. Прямой вызов из apps/ запрещён (AGENTS.md) — это
 * и есть доступ к чужим заказам. Штатный путь — forAccount().
 */

// В dev Next пересоздаёт модули при каждой правке; без кэша на globalThis
// пул соединений вырастет до отказа базы.
const globalForPrisma = globalThis as unknown as { skladplusPrisma?: PrismaClient }

export function unsafePrisma(): PrismaClient {
  const existing = globalForPrisma.skladplusPrisma
  if (existing) return existing

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL не задан. Реальные значения живут в ~/.skladplus/env, образец — .env.example',
    )
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  globalForPrisma.skladplusPrisma = client
  return client
}
