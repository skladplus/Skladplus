import { unsafePrisma } from '@skladplus/db'

/**
 * Проверка живости для docker compose, CI и мониторинга.
 * Отвечает честно: если база недоступна — 503, а не 200 с текстом об ошибке.
 * Здесь допустим прямой unsafePrisma(): запрос не читает данные клиентов.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const startedAt = Date.now()

  try {
    await unsafePrisma().$queryRaw`SELECT 1`
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        database: 'unreachable',
        // Текст ошибки наружу не отдаём: он содержит хост и имя базы.
        reason: error instanceof Error ? error.name : 'UnknownError',
      },
      { status: 503 },
    )
  }

  return Response.json({
    status: 'ok',
    database: 'ok',
    latencyMs: Date.now() - startedAt,
    // Время в UTC: рантайм Vercel всегда UTC, показ в киевской зоне —
    // задача интерфейса, а не этого ответа.
    at: new Date().toISOString(),
  })
}
