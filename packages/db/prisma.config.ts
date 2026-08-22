import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Миграции ходят ТОЛЬКО по прямому подключению: pooled его не переживёт.
    // Рантайм приложения использует DATABASE_URL через driver adapter, см. src/client.ts.
    //
    // Два имени намеренно. Локально и в CI переменная зовётся DIRECT_URL;
    // интеграция Neon↔Vercel называет ту же строку DATABASE_URL_UNPOOLED
    // и проставляет её сама. Переименовывать её руками нельзя — ручные
    // значения конфликтуют с тем, что интеграция перезаписывает при каждом
    // деплое, поэтому подстраиваемся мы.
    //
    // process.env, а не строгий env() из prisma/config: строгая версия роняет
    // любую команду при отсутствии переменной, включая prisma generate
    // на сборке Vercel, где SHADOW_DATABASE_URL нет и быть не должно.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED,
    // Отдельная база: prisma migrate diff её пересоздаёт при каждом запуске.
    // Указать сюда рабочую — значит снести её этой командой.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})
