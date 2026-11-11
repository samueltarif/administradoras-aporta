// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Componentes gerados pelo shadcn-vue seguem o padrão do registry.
    files: ['app/components/ui/**/*.vue'],
    rules: { 'vue/require-default-prop': 'off' },
  },
  { ignores: ['_pacote/**', 'migracao/**', 'supabase/**'] },
)
