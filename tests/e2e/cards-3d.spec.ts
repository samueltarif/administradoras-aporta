import { expect, test } from '@playwright/test'
import { expectClean, login, watchConsole } from './helpers'

const viewer = '[aria-label="Representação 3D genérica de um condomínio residencial"]'

test.describe('login com visualização 3D', () => {
  test('desktop: 3D carrega sem bloquear o formulário', async ({ page }) => {
    const issues = watchConsole(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')
    await expect(page.getByLabel('E-mail')).toBeVisible()
    const desktop = page.locator(viewer).filter({ visible: true })
    await expect(desktop.getByText('Visualização 3D carregada', { exact: false })).toBeAttached({ timeout: 15_000 })
    await expectClean(issues)
  })

  test('sem WebGL: imagem estática e login segue funcionando', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      // @ts-expect-error assinatura sobrecarregada
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        return /webgl/.test(type) ? null : orig.call(this, type, ...args as [])
      }
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/login')
    await expect(page.getByText('Imagem estática (3D indisponível)').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  test('mobile: formulário primeiro, 3D só sob demanda', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await page.waitForTimeout(3000)
    await expect(page.getByRole('button', { name: 'Ver em 3D' })).toBeVisible()
  })
})

test.describe('clientes: tabela e cards (proprietário)', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'owner') })

  test('alternância, filtros, paginação e abertura pelo card', async ({ page }) => {
    const issues = watchConsole(page)
    await page.goto('/admin/clientes')
    await page.getByRole('button', { name: 'Cards' }).click()
    await expect(page).toHaveURL(/view=cards/)
    await expect(page.getByRole('link', { name: /^Abrir cadastro:/ }).first()).toBeVisible()

    await page.goto('/admin/clientes?view=cards&kind=condominium')
    const cards = page.getByRole('link', { name: /^Abrir cadastro:/ })
    await expect(cards.first()).toBeVisible()
    for (const name of await cards.allTextContents()) expect(name).not.toMatch(/Centro Logístico/)

    await page.reload()
    await expect(page.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page).toHaveURL(/kind=condominium/)
    await expect(page.locator('tbody tr').first()).toBeVisible()

    await page.goto('/admin/clientes?view=cards&pageSize=10')
    await expect(page.getByText(/^1–10 de \d+/)).toBeVisible()
    await page.getByRole('button', { name: 'Próxima' }).click()
    await expect(page).toHaveURL(/page=2/)

    await page.goto('/admin/clientes?view=cards&q=Aurora')
    await page.getByRole('link', { name: 'Abrir cadastro: Condomínio Aurora (Demo)' }).click()
    await expect(page.getByRole('heading', { name: 'Dados cadastrais' })).toBeVisible()
    // O cadastro não exibe modelo 3D (decisão do cliente em 11/11).
    await expect(page.getByRole('heading', { name: 'Visualização 3D do condomínio' })).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)

    await page.goto('/admin/clientes?view=cards&q=Centro')
    await page.getByRole('link', { name: /Abrir cadastro: Centro Logístico/ }).click()
    await expect(page.getByRole('heading', { name: 'Dados cadastrais' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Visualização 3D do condomínio' })).toHaveCount(0)
    await expectClean(issues)
  })
})
