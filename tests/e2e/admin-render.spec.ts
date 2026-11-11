import { expect, test } from '@playwright/test'
import { expectClean, login, watchConsole } from './helpers'

test.describe('painel: telas renderizam campos e tabelas (proprietário)', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'owner') })

  test('dashboard, chamados, agenda, contratos, cadastros e usuários', async ({ page }) => {
    const issues = watchConsole(page)
    await page.goto('/admin')
    await expect(page.getByText('Chamados em aberto')).toBeVisible()
    await page.getByRole('link', { name: /Clientes ativos/ }).click()
    await expect(page).toHaveURL(/\/admin\/clientes/)

    await page.goto('/admin/chamados?status=all')
    await expect(page.getByText(/de 25$/)).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(20)

    await page.goto('/admin/chamados/novo')
    for (const id of ['customer_id', 'category', 'priority', 'title', 'location_detail', 'description', 'files']) await expect(page.locator(`#${id}`)).toBeVisible()

    await page.goto('/admin/agenda')
    for (const id of ['v-customer', 'v-title', 'v-when', 'v-tech']) await expect(page.locator(`#${id}`)).toBeVisible()
    await expect(page.locator('section li').first()).toBeVisible()

    await page.goto('/admin/contratos')
    await expect(page.locator('tbody tr')).toHaveCount(8)
    await page.goto('/admin/contratos/novo')
    for (const id of ['c-customer', 'c-type', 'c-title', 'c-status', 'c-value']) await expect(page.locator(`#${id}`)).toBeVisible()

    for (const path of ['/admin/clientes/novo', '/admin/administradoras/nova']) {
      await page.goto(path)
      for (const id of ['trade_name', 'legal_name', 'cnpj', 'email', 'phone', 'address_text']) await expect(page.locator(`#${id}`)).toBeVisible()
    }
    await page.goto('/admin/usuarios')
    for (const id of ['i-name', 'i-email', 'i-scope', 'i-role']) await expect(page.locator(`#${id}`)).toBeVisible()
    await expect(page.getByText('dono@demo.example.com')).toBeVisible()

    await page.goto('/admin/chamados?status=all')
    await page.locator('tbody tr a').first().click()
    await expect(page.getByText('Histórico e mensagens')).toBeVisible()
    await expect(page.getByText('Notas internas')).toBeVisible()
    await expect(page.locator('#st-status')).toBeVisible()
    await expectClean(issues)
  })
})
