#!/usr/bin/env node
// Отметки `✓` в дереве папок docs/05-system-design.md §4 сверяются с git в обе
// стороны: отмеченный путь обязан быть в репозитории, неотмеченный — нет.
// Без проверки дерево устаревает молча и врёт в обе стороны: `✓` у исчезнувшей
// папки читается как «уже сделано», а появившаяся без отметки — как «ещё нет».
// Так и разошлись `apps/web/lib` и `packages/core/src` — их нашла эта проверка.
//
// Существование берётся из `git ls-files`, а не из файловой системы: иначе
// сборку и `node_modules` пришлось бы вычитать вручную, а пустая папка на диске
// выдавала бы себя за сделанную работу.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DOC = 'docs/05-system-design.md'

// Уровень вложенности — это префикс из глифов: `│   ` или четыре пробела.
// Считаем группы, а не длину строки: глифы многобайтные, и длина соврала бы.
const BRANCH = /^((?:[│ ] {3})*)(?:├──|└──) (.+)$/u
// Корень блока — строка без глифов: `apps/web/`, `packages/core/  ✓ # …`.
const ROOT = /^([A-Za-z][\w./-]*\/)\s*(✓)?/u

/** Разбирает первый блок ```text после «## 4. …» в список узлов с путями. */
export function parseTree(text) {
  const lines = text.split('\n')
  const from = lines.findIndex((l) => l.startsWith('## 4. '))
  if (from < 0) throw new Error(`${DOC}: нет раздела «## 4. …» — дерево не найдено`)
  const start = lines.indexOf('```text', from)
  const end = lines.indexOf('```', start + 1)
  if (start < 0 || end < 0) throw new Error(`${DOC} §4: нет блока \`\`\`text с деревом`)

  const nodes = []
  let root = ''
  let stack = []
  for (const line of lines.slice(start + 1, end)) {
    if (!line.trim()) continue
    const branch = BRANCH.exec(line)
    if (!branch) {
      const r = ROOT.exec(line)
      if (r) {
        root = r[1]
        stack = []
        nodes.push({ path: r[1].replace(/\/$/, ''), tick: Boolean(r[2]) })
      }
      // Иначе это строка-продолжение комментария — узла в ней нет.
      continue
    }
    if (!root) throw new Error(`${DOC} §4: узел до корня дерева — «${line}»`)
    const depth = branch[1].length / 4
    const label = branch[2].split('#')[0].trim()
    const name = label.replace('✓', '').trim().replace(/\/$/, '')
    if (!name) continue
    stack = stack.slice(0, depth)
    stack.push(name)
    nodes.push({ path: root + stack.join('/'), tick: label.includes('✓') })
  }
  return nodes
}

/** Путь в git: файл или любая папка на пути к нему. */
export function trackedSet(files) {
  const set = new Set()
  for (const f of files) {
    const parts = f.split('/')
    for (let i = 1; i <= parts.length; i++) set.add(parts.slice(0, i).join('/'))
  }
  return set
}

/**
 * Папка, у которой отмечен потомок, существует по определению — своя отметка
 * ей не нужна. Заглушки `<модуль>`, `<job>` — не пути, с них нечего спрашивать.
 */
export function compare(nodes, tracked) {
  const ticked = nodes.filter((n) => n.tick).map((n) => n.path)
  const problems = []
  for (const n of nodes) {
    if (n.path.includes('<') || n.path.includes('…')) continue
    const expected = n.tick || ticked.some((t) => t.startsWith(`${n.path}/`))
    if (tracked.has(n.path) === expected) continue
    problems.push(
      expected
        ? `${n.path} — в дереве \`✓\`, но в git такого пути нет`
        : `${n.path} — есть в git, но в дереве без \`✓\``,
    )
  }
  return problems
}

// Разбор дерева легко сломать так, что он молча перестанет что-либо находить,
// и проверка станет зелёной навсегда. Образец гоняется на каждом запуске.
const FIXTURE = [
  '## 4. Структура папок',
  '',
  '```text',
  'apps/web/',
  '├── app/',
  '│   ├── api/',
  '│   │   ├── health/            ✓ # комментарий со словом ✓ и скобкой (03 §4)',
  '│   │   ├── cron/<job>/          ✓ # заглушка с отметкой: спрашивать с неё нечего',
  '│   │   └── webhooks/<источник>/ # заглушка без отметки',
  '│   └── page.tsx               ✓',
  '├── lib/                         # клей, комментарий переносится',
  '│   │                            #   на вторую строку',
  '│   └── np/',
  '└── next.config.ts             ✓',
  '',
  'packages/core/                 ✓',
  '└── src/',
  '```',
  '',
].join('\n')

const FIXTURE_FILES = [
  'apps/web/app/api/health/route.ts',
  'apps/web/app/page.tsx',
  'apps/web/next.config.ts',
  'packages/core/package.json',
]

function selftest() {
  const nodes = parseTree(FIXTURE)
  const paths = nodes.map((n) => n.path)
  const want = [
    'apps/web',
    'apps/web/app',
    'apps/web/app/api',
    'apps/web/app/api/health',
    'apps/web/app/api/cron/<job>',
    'apps/web/app/api/webhooks/<источник>',
    'apps/web/app/page.tsx',
    'apps/web/lib',
    'apps/web/lib/np',
    'apps/web/next.config.ts',
    'packages/core',
    'packages/core/src',
  ]
  if (paths.join('\n') !== want.join('\n')) {
    throw new Error(
      `разбор дерева сломан:\n  получено: ${paths.join(' ')}\n  ожидалось: ${want.join(' ')}`,
    )
  }

  const cases = [
    ['образец сходится', FIXTURE_FILES, []],
    [
      'папка появилась, отметки нет',
      [...FIXTURE_FILES, 'packages/core/src/index.ts'],
      ['packages/core/src — есть в git, но в дереве без `✓`'],
    ],
    [
      'файл под неотмеченной папкой тоже виден',
      [...FIXTURE_FILES, 'apps/web/lib/utils.ts'],
      ['apps/web/lib — есть в git, но в дереве без `✓`'],
    ],
    [
      'отметка осталась от исчезнувшего пути',
      FIXTURE_FILES.filter((f) => f !== 'apps/web/next.config.ts'),
      ['apps/web/next.config.ts — в дереве `✓`, но в git такого пути нет'],
    ],
  ]
  for (const [name, files, want] of cases) {
    const got = compare(nodes, trackedSet(files))
    if (got.join('\n') !== want.join('\n')) {
      throw new Error(
        `самопроверка «${name}»:\n  получено: ${got.join('; ') || '—'}\n  ожидалось: ${want.join('; ') || '—'}`,
      )
    }
  }
}

function main() {
  process.chdir(fileURLToPath(new URL('..', import.meta.url)))
  selftest()

  const nodes = parseTree(readFileSync(DOC, 'utf8'))
  // Проверка, которой нечего читать, не должна выглядеть успешной.
  if (nodes.length < 20)
    throw new Error(`${DOC} §4: разобрано узлов ${nodes.length} — разбор сломан`)
  const ticked = nodes.filter((n) => n.tick).length
  if (!ticked) throw new Error(`${DOC} §4: ни одной отметки \`✓\` — разбор сломан`)

  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 << 20 })
  const problems = compare(nodes, trackedSet(files.split('\0').filter(Boolean)))
  if (problems.length) {
    console.error(`::error::дерево папок ${DOC} §4 разошлось с репозиторием`)
    for (const p of problems) console.error(p)
    process.exit(1)
  }
  console.log(`дерево ${DOC} §4: узлов ${nodes.length}, из них с \`✓\` ${ticked} — сходится с git`)
}

try {
  main()
} catch (e) {
  console.error(`::error::${e.message}`)
  process.exit(1)
}
