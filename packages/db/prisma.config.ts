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
    // Здесь process.env, а не строгий env() из prisma/config: строгая версия
    // роняет любую команду при отсутствии переменной, включая prisma generate
    // на сборке Vercel, где SHADOW_DATABASE_URL нет и быть не должно.
    url: process.env.DIRECT_URL,
    // Отдельная база: prisma migrate diff её пересоздаёт при каждом запуске.
    // Указать сюда рабочую — значит снести её этой командой.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})
