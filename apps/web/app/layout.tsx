import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Skladplus',
  description: 'Платформа фулфілменту: приймання, зберігання, збірка та відправлення',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  )
}
