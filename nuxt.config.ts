// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/icon', '@nuxt/image', '@nuxtjs/tailwindcss', '@nuxtjs/mdc'],
  nitro: {
    compressPublicAssets: true,
    storage: {
      document: {
        driver: 'fs',
        base: './document',
      },
      fs: {
        driver: 'fs',
        base: './static',
      },
    },
  },
  routeRules: {
    '/api/**': { cors: true },
  },
  runtimeConfig: {
    app: {
      version: '',
      buildTime: '',
    },
  },
})
