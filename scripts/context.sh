#!/usr/bin/env bash
# Ввод в контекст — шаг 0 любой сессии. Один и тот же скрипт для обоих агентов:
# у Claude Code он висит на SessionStart, у Codex вызывается по правилу в AGENTS.md.
# Сетевые блоки идут последними и ограничены дедлайном, чтобы отвал GitHub
# не превращал старт сессии в ожидание.

set -uo pipefail
set +m

root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "не git-репозиторий"; exit 0; }
cd "$root" || exit 0

hr() { printf '\n── %s\n' "$1"; }

# У macOS нет coreutils timeout, поэтому дедлайн свой.
with_deadline() {
  local secs=$1; shift
  "$@" & local pid=$!
  ( sleep "$secs"; kill -TERM "$pid" ) >/dev/null 2>&1 & local watcher=$!
  wait "$pid" 2>/dev/null; local rc=$?
  kill -TERM "$watcher" >/dev/null 2>&1; wait "$watcher" 2>/dev/null
  return $rc
}

branch="$(git branch --show-current 2>/dev/null)"

hr "ВЕТКА"
echo "${branch:-(ветка без коммитов)}"

hr "ПОСЛЕДНИЕ КОММИТЫ"
git log --oneline --no-decorate -8 2>/dev/null || echo "(история пуста)"

hr "НЕЗАКОММИЧЕНО"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  git status --short 2>/dev/null | head -20
else
  echo "(чисто)"
fi

# Владелец: явная переменная, иначе по префиксу ветки, иначе оба журнала.
owner="${SKLADPLUS_OWNER:-}"
if [ -z "$owner" ]; then
  case "$branch" in
    */alex-*) owner=alex ;;
    */step-*) owner=step ;;
  esac
fi

hr "ЖУРНАЛ"
for who in ${owner:-alex step}; do
  f="PROGRESS/${who}.md"
  [ -f "$f" ] || continue
  echo "· $f"
  tail -n 12 "$f" | sed 's/^/  /'
done

hr "ПРАВИЛА"
echo "AGENTS.md — канон ($(wc -l < AGENTS.md | tr -d ' ') строк, лимит 150)."
echo "Запреты: AI в авторстве · секреты в git · «Skladplus находка/» · pnpm dlx/npx · ПДн в issue."

if [ "${SKLADPLUS_CONTEXT_OFFLINE:-0}" = "1" ] || ! command -v gh >/dev/null 2>&1; then
  hr "GITHUB"
  echo "(пропущено)"
  exit 0
fi

hr "ОТКРЫТЫЕ PR"
with_deadline 5 gh pr list --limit 10 \
  --json number,title,author,isDraft,statusCheckRollup \
  --template '{{range .}}#{{.number}} {{.title}} — {{.author.login}}{{if .isDraft}} [draft]{{end}}
{{end}}' 2>/dev/null || echo "(недоступно)"

hr "ЗАДАЧИ В РАБОТЕ"
with_deadline 5 gh issue list --limit 10 --state open \
  --json number,title,assignees \
  --template '{{range .}}#{{.number}} {{.title}}{{range .assignees}} @{{.login}}{{end}}
{{end}}' 2>/dev/null || echo "(недоступно)"
