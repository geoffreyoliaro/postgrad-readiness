export default defineNuxtConfig({
  compatibilityDate: "2025-05-01",
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "http://localhost:3001/api",
    },
  },
  css: ["~/assets/css/main.css"],
  ssr: true,
  typescript: {
    strict: true,
  },
});
