#!/usr/bin/env bash
# Клон → одна команда → работающий проект. Он же проверка воспроизводимости
# на чужой машине: если скрипт где-то падает, значит каркас держится
# на памяти автора, а не на репозитории.
#
#   bash scripts/bootstrap.sh

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

env_file="${SKLADPLUS_ENV_FILE:-$HOME/.skladplus/env}"
db_port="${SKLADPLUS_DB_PORT:-5433}"

say() { printf '\n▸ %s\n' "$1"; }
die() { printf '\n✗ %s\n' "$1" >&2; exit 1; }

say "Проверяю инструменты"
command -v node >/dev/null || die "нет node. Нужна версия из .nvmrc ($(cat .nvmrc))"
command -v docker >/dev/null || die "нет docker"
docker info >/dev/null 2>&1 || die "docker установлен, но демон не запущен"
node_major="$(node -p 'process.versions.node.split(".")[0]')"
want_major="$(tr -dc '0-9' < .nvmrc)"
[ "$node_major" = "$want_major" ] || printf '  ! node %s, а в .nvmrc %s\n' "$node_major" "$want_major"
corepack enable >/dev/null 2>&1 || printf '  ! corepack enable не прошёл, возможно нужен sudo\n'
printf '  node %s · pnpm %s · docker есть\n' "$(node -v)" "$(pnpm -v 2>/dev/null || echo '—')"

say "Секреты"
# В репозитории только .env.example. Реальные значения живут вне рабочей папки:
# это единственный контроль, работающий одинаково для Claude Code и Codex,
# потому что не зависит от настроек агента.
if [ ! -f "$env_file" ]; then
  mkdir -p "$(dirname "$env_file")"
  sed "s/:5433/:${db_port}/g" .env.example > "$env_file"
  chmod 600 "$env_file"
  printf '  создан %s из .env.example — проверьте значения\n' "$env_file"
else
  printf '  использую существующий %s\n' "$env_file"
fi
set -a
# shellcheck disable=SC1090  # путь известен только в рантайме
. "$env_file"
set +a

say "Зависимости"
pnpm install --frozen-lockfile

say "База"
docker compose up -d
printf '  жду готовности'
for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U postgres -d skladplus >/dev/null 2>&1; then
    printf ' готова\n'; break
  fi
  printf '.'; sleep 1
done
docker compose exec -T postgres pg_isready -U postgres -d skladplus >/dev/null 2>&1 \
  || die "postgres не поднялся за 60 секунд"

say "Миграции и клиент Prisma"
pnpm -r --if-present db:deploy
pnpm -r --if-present db:generate

say "Проверка"
pnpm -r --if-present typecheck
pnpm -r --if-present test

cat <<'DONE'

✓ Готово.

  pnpm dev                              запустить приложение
  http://127.0.0.1:3000/api/health      проверка живости
  bash scripts/context.sh               ввод в контекст, шаг 0 любой сессии

Правила — в AGENTS.md. Отложенные вопросы — в docs/09-findings-backlog.md.
DONE
