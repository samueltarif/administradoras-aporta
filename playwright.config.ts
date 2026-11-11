import { defineConfig, devices } from '@playwright/test'

// Senhas demo: lidas localmente do arquivo não versionado (nunca no código nem no Git).
try { process.loadEnvFile('migracao/demo_passwords.local.env') } catch { /* CI define as variáveis */ }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: process.env.CI ? 'retain-on-failure' : 'off', locale: 'pt-BR' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
})
