import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Testes unitários e de estrutura (rodam após `nuxt prepare`, que gera .nuxt/components.d.ts).
export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
})

