/**
 * Заглушка до нитки «Товар завівся» (`docs/07-workplan.md`, этап 1).
 * Здесь же проверка, что токены доехали: страница красится только тем,
 * что объявлено в `app/globals.css`.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-3 p-6">
      <h1 className="font-semibold text-3xl tracking-tight">Skladplus</h1>
      <p className="text-muted-foreground">Каркас. Робочі екрани з’являться на наступному етапі.</p>
    </main>
  )
}
