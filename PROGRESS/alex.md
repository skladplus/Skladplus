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

**Дальше:** организация `skladplus`, перенос репозитория, приглашение @Stepandj.

## 2026-08-22 · chore/alex-github · #1 · CI и правила

**Сделано:** десять джобов под агрегатом `ci-ok`, экшены пинованы SHA
(`sha_pinning_required` включён), actionlint и gitleaks — бинарями с проверкой
sha256. CODEOWNERS, dependabot на npm и github-actions, шаблоны PR и issue
с обязательным правилом «только ID», `.coderabbit.yaml`. Ruleset на `main`
с `bypass_actors: []`.

**Проверено боем, не на бумаге:** прямой push в `main` отбит
(`push declined due to repository rule violations`) · merge-коммит и rebase
отклонены, squash прошёл · squash-сообщение — одна строка заголовка, без трейлеров ·
ветка удалена автоматически · синтетический PR #2 с `Co-Authored-By: Claude` уронил
`ci-ok`, диапазон посчитан верно · `gh pr merge --squash --admin` по красному CI
отклонён. PR #2 закрыт, в `main` не попал.

**Дальше:** организация, перенос, @Stepandj.

**Открытые вопросы:** ждут ответа заказчика — см. `docs/findings-backlog.md`.
