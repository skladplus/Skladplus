import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Склейка классов для компонентов shadcn/ui: clsx собирает условные,
 * tailwind-merge разрешает конфликты в пользу последнего.
 *
 * Без него `className` снаружи не переопределяет класс внутри компонента —
 * побеждает не последний в строке, а более специфичный в CSS, и правка
 * отступа у одной кнопки молча не применяется.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
