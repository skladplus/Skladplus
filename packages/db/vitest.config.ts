import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Рантайм Vercel — UTC. Тесты в киевской зоне были бы зелёными при красном
    // проде, и всплыло бы это на SLA «30 рабочих минут».
    env: { TZ: 'UTC' },
    include: ['src/**/*.test.ts'],
    exclude: ['src/generated/**'],
  },
})
