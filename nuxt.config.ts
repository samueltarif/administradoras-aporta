// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const isDev = process.env.NODE_ENV !== 'production'
// Origem do Supabase lida do .env no momento do build (necessária para a CSP).
const supabaseOrigin = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : ''
const supabaseWs = supabaseOrigin.replace(/^https:/, 'wss:')

export default defineNuxtConfig({
  modules: ['@nuxtjs/supabase', '@nuxt/eslint', '@nuxt/icon', 'shadcn-nuxt', 'nuxt-security'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['@fontsource-variable/inter', 'vue-sonner/style.css', '~/assets/css/tailwind.css'],
  vite: { plugins: [tailwindcss()] },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Portal A Porta Móvel',
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },

  supabase: {
    // Tipos do portal; regenerar com: npm run db:types
    types: '~/types/database.types.ts',
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirmar',
      exclude: ['/recuperar-senha', '/redefinir-senha'],
      saveRedirectToCookie: true,
    },
  },

  shadcn: { prefix: '', componentDir: '@/components/ui' },

  icon: {
    serverBundle: { collections: ['lucide'] },
    clientBundle: { scan: true },
    // Sem chamadas ao api.iconify.design (bloqueadas pelo CSP): ícones vêm do bundle ou do endpoint local.
    fallbackToApi: false,
  },

  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'connect-src': ["'self'", supabaseOrigin, supabaseWs].filter(Boolean),
        'img-src': ["'self'", 'data:', 'blob:', supabaseOrigin].filter(Boolean),
        'font-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': !isDev,
      },
      // 'credentialless' permite imagens assinadas do Storage sem cabeçalho CORP.
      crossOriginEmbedderPolicy: isDev ? 'unsafe-none' : 'credentialless',
    },
    // Evita bloquear o HMR em desenvolvimento.
    rateLimiter: isDev ? false : { tokensPerInterval: 150, interval: 300000 },
  },

  routeRules: {
    // Anexos: até 10 MB por arquivo (validados pelo conteúdo no servidor); binário não passa pelo validador XSS.
    '/api/tickets/**': {
      security: { requestSizeLimiter: { maxUploadFileRequestInBytes: 11 * 1024 * 1024 }, xssValidator: false },
    },
    '/admin/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/portal/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  },

  typescript: {
    strict: true,
    // Falha o typecheck se um template usar componente inexistente (evita telas vazias silenciosas).
    tsConfig: { vueCompilerOptions: { checkUnknownComponents: true } },
  },
})
