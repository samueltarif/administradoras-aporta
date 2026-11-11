import { expect, type Page } from '@playwright/test'

export const ACCOUNTS = {
  owner: ['dono@demo.example.com', 'DEMO_PASSWORD_OWNER'],
  syndic: ['sindico.jardins@demo.example.com', 'DEMO_PASSWORD_SYNDIC'],
  porter: ['porteiro.jardins@demo.example.com', 'DEMO_PASSWORD_PORTER'],
  managerBeta: ['gestora.beta@demo.example.com', 'DEMO_PASSWORD_MANAGER_BETA'],
} as const

/** Coleta avisos/erros do console; o teste falha se houver componente não resolvido ou erro de hidratação. */
export function watchConsole(page: Page) {
  const issues: string[] = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (/Failed to resolve component|Hydration|hydration/i.test(text) || msg.type() === 'error') issues.push(`[${msg.type()}] ${text}`)
  })
  page.on('pageerror', e => issues.push(`[pageerror] ${e.message}`))
  return issues
}

export async function login(page: Page, who: keyof typeof ACCOUNTS) {
  const [email, envKey] = ACCOUNTS[who]
  const password = process.env[envKey]
  if (!password) throw new Error(`Defina ${envKey} (migracao/demo_passwords.local.env)`)
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'))
}

export async function expectClean(issues: string[]) {
  expect(issues, issues.join('\n')).toEqual([])
}
