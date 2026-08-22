import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // Пакеты воркспейса отдаются исходниками, а не сборкой: один шаг сборки
  // вместо двух, и правка в packages/ видна в dev сразу.
  transpilePackages: ['@skladplus/core', '@skladplus/db'],
}

export default config
