/**
 * Бизнес-логика без фреймворка. Этот пакет не импортирует React и Next —
 * граница проверяется отдельным шагом CI. Иначе логика прирастает
 * к фреймворку и перестаёт тестироваться отдельно.
 */

/** Деньги — целые копейки. Ни Float, ни Decimal: см. AGENTS.md. */
export type Kopecks = bigint

const KOPECKS_IN_HRYVNIA = 100n

export function formatHryvnia(amount: Kopecks): string {
  const sign = amount < 0n ? '-' : ''
  const abs = amount < 0n ? -amount : amount
  const whole = abs / KOPECKS_IN_HRYVNIA
  const fraction = abs % KOPECKS_IN_HRYVNIA
  return `${sign}${whole},${String(fraction).padStart(2, '0')} грн`
}

const KYIV = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'Europe/Kyiv',
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * Единственный разрешённый способ показать время пользователю.
 * Рантайм всегда UTC — форматирование в локальной зоне процесса дало бы
 * расхождение между машиной разработчика и продом.
 */
export function formatKyiv(at: Date): string {
  return KYIV.format(at)
}
