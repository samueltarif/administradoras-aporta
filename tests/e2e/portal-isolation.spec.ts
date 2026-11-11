import { expect, test } from '@playwright/test'
import { demoId } from '../../scripts/seed/lib.mjs'
import { expectClean, login, watchConsole } from './helpers'

test('síndico: portal renderiza início, chamados, contratos e agenda @mobile', async ({ page }) => {
  const issues = watchConsole(page)
  await login(page, 'syndic')
  await expect(page).toHaveURL(/\/portal$/)
  await expect(page.getByText('Atualizações recentes')).toBeVisible()
  await page.goto('/portal/chamados?status=all')
  await expect(page.locator('tbody tr').first()).toBeVisible()
  await page.goto('/portal/chamados/novo')
  await expect(page.locator('#title')).toBeVisible()
  await page.goto('/portal/contratos')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.goto('/portal/agenda')
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
  await expectClean(issues)
})

test('porteiro vê apenas os próprios chamados e não acessa o painel', async ({ page }) => {
  await login(page, 'porter')
  await page.goto('/portal/chamados?status=all')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'Contratos' })).toHaveCount(0)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/portal/)
})

test('gestora Beta não abre chamado de condomínio da Alfa', async ({ page }) => {
  await login(page, 'managerBeta')
  await page.goto(`/portal/chamados/${demoId('ticket:0')}`)
  await expect(page.getByText(/não encontrado ou sem permissão|Registro não encontrado/)).toBeVisible()
})
