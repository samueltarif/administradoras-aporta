import { provideSSRWidth } from '@vueuse/core'

// Evita erros de hidratação em componentes responsivos do shadcn-vue.
export default defineNuxtPlugin((nuxtApp) => {
  provideSSRWidth(1024, nuxtApp.vueApp)
})
