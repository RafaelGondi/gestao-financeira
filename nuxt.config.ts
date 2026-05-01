export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  colorMode: { preference: 'light' },
  nitro: {
    externals: {
      external: ['better-sqlite3']
    }
  }
})
