import { chromium } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: 'migracao/demo_passwords.local.env' })
dotenv.config({ path: '.env' })

const BASE_URL = 'http://localhost:3000'

async function runVerification() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  // 1. Operações: deve ser redirecionado de /admin/usuarios para /admin
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/login`)
    await page.fill('#email', 'operacoes@demo.example.com')
    await page.fill('#password', process.env.DEMO_PASSWORD_OPERATIONS)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/admin`, { timeout: 15000 })
    
    // Now navigate to /admin/usuarios
    await page.goto(`${BASE_URL}/admin/usuarios`, { waitUntil: 'networkidle' })
    const currentUrl = page.url()
    const redirected = currentUrl === `${BASE_URL}/admin`
    const bodyText = await page.innerText('body')
    const hasError = bodyText.includes('500') || bodyText.includes('Infinite redirect')
    
    results.push({
      profile: 'Funcionário Interno (Operações)',
      routeTest: '/admin/usuarios -> redirect',
      success: redirected && !hasError,
      currentUrl,
      notes: redirected ? 'Redirecionamento correto para /admin sem loop' : 'Falha no redirecionamento'
    })
    await context.close()
  }

  // 2. Atendente Alfa: login e verificação de chamados
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/login`)
    await page.fill('#email', 'atendente.alfa@demo.example.com')
    await page.fill('#password', process.env.DEMO_PASSWORD_ATTENDANT_ALFA)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => url.pathname.startsWith('/portal') || url.pathname.startsWith('/admin'), { timeout: 15000 })
    const postLoginUrl = page.url()
    
    // Check ticket list access
    await page.goto(`${BASE_URL}/portal/chamados`, { waitUntil: 'networkidle' })
    const title = await page.title()
    const content = await page.innerText('body')
    const hasTickets = content.includes('Chamados') || content.includes('Protocolo') || content.includes('Nenhum chamado')
    
    results.push({
      profile: 'Atendente Alfa',
      postLoginUrl,
      success: hasTickets,
      notes: 'Acessou /portal/chamados com sucesso'
    })
    await context.close()
  }

  // 3. Síndico Independente: login e verificação de condomínio avulso
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/login`)
    await page.fill('#email', 'sindico.avulso@demo.example.com')
    await page.fill('#password', process.env.DEMO_PASSWORD_INDEPENDENT)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => url.pathname.startsWith('/portal'), { timeout: 15000 })
    const postLoginUrl = page.url()
    
    // Check portal access
    await page.goto(`${BASE_URL}/portal`, { waitUntil: 'networkidle' })
    const content = await page.innerText('body')
    const hasPortal = content.includes('Condomínio') || content.includes('Chamados') || content.includes('Início')
    
    results.push({
      profile: 'Síndico Independente (Avulso)',
      postLoginUrl,
      success: hasPortal,
      notes: 'Acessou /portal do condomínio avulso com sucesso'
    })
    await context.close()
  }

  await browser.close()
  console.log(JSON.stringify(results, null, 2))
}

runVerification().catch(err => {
  console.error(err)
  process.exit(1)
})

