/**
 * Tailwind 4 подключается PostCSS-плагином из отдельного пакета.
 * Ни postcss-import, ни autoprefixer не нужны: и то и другое v4 делает сама.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
