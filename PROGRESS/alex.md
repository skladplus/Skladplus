# Журнал — alex (@yennned)

Запись после каждого локального коммита: дата · ветка · хеш · что сделано ·
что дальше · открытые вопросы. Формат из NovaPostBot, проверен на 4800 строках.

---

## 2026-08-22 · main · этап 0, каркас

**Сделано:** корневой скелет монорепо (pnpm 10.34.5, Node 24, TypeScript 7.0.2,
Biome 2.5.10), deny-by-default `.gitignore`, `AGENTS.md` как канон правил,
`scripts/context.sh` как единый ввод в контекст, `.claude/settings.json`
с `includeCoAuthoredBy: false` и deny-правилами.
Удалён профиль браузера с чужой живой сессией (куки и Login Data).

**Дальше:** организация `skladplus`, перенос репозитория, PR с `.github/`, ruleset.

**Открытые вопросы:** ждут ответа заказчика — см. `docs/findings-backlog.md`.
