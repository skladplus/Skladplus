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

## 2026-08-22 · feat/alex-skeleton · #4 · приложение и слой доступа

**Сделано:** Next 16 с `/api/health`, `packages/db` с Prisma 7 и обёрткой
`forAccount(accountId)`, `packages/core` без React и Next, docker-compose
на порту 5433, `scripts/bootstrap.sh`, 13 плагинов в project-scope,
чистка скиллов (13 security → 3).

**Проверено:** health отдаёт 200 с реальным запросом в базу и 503 без утечки
хоста · `db:diff` даёт 2 при дрейфе и 0 после отката · `prisma generate`
работает без переменных окружения · `migrate deploy` идемпотентен ·
7 контрактных тестов на разграничение клиентов.

**Что поймал CI, а не я:** сгенерированный клиент Prisma нужен каждому джобу,
а не только сборке. Локально `typecheck` и `unit` проходили на клиенте
от прошлых запусков.

**Организация:** `skladplus` создана, репозиторий перенесён, @Stepandj владелец.
Перенос сбросил secret scanning и push protection — возвращено, плюс выставлены
org-настройки по умолчанию. Доска Projects с пятью колонками привязана к репозиторию.

**Дальше:** CodeRabbit App, Neon, Vercel, Sentry — только через браузер.
2FA у @Stepandj — самое слабое место защиты.

## 2026-08-22 · chore/alex-neon · Neon

**Сделано:** проект Skladplus во Франкфурте на Postgres 18, Launch. Ветка
`production` защищена, автоскейл снижен 8 → 1 CU. Ключ MCP ограничен проектом,
лежит в `~/.skladplus/env`, в конфиг записана переменная.

**Что поймал:** боевая база NovaPostBot в той же организации Neon, поэтому
OAuth для MCP открыл бы агенту чужой прод. Онбординг Neon сам прописал такой
сервер в user-scope — удалён. Ветка как граница доступа в Neon не существует
вовсе, только проект.

**Своя ошибка:** первая попытка выпуска ключа напечатала его в вывод. Отозван
и перевыпущен.

**Дальше:** Vercel и интеграция Neon↔Vercel до первого preview. Сессию нужно
перезапустить — `NEON_API_KEY` появится в окружении из `~/.zshrc`.
