import { expect, test } from '@playwright/test'
import { expectClean, login, watchConsole } from './helpers'

// Dados FICTÍCIOS, marcados com "(E2E)". Persistência conferida após recarregar a página.
test('proprietário cadastra, edita e vincula um cliente', async ({ page }) => {
  const issues = watchConsole(page)
  await login(page, 'owner')
  const name = `Condomínio E2E ${Date.now()} (E2E)`
  await page.goto('/admin/clientes/novo')
  await page.locator('#trade_name').fill(name)
  await page.locator('#customer_kind').selectOption('condominium')
  await page.locator('#cnpj').fill('11.222.333/0001-81')
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await page.waitForURL(/\/admin\/clientes\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()

  await page.locator('#legal_name').fill('Razão Social E2E Ltda (fictícia)')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Alterações salvas.')).toBeVisible()

  page.once('dialog', d => d.accept())
  await page.locator('#as-target').selectOption({ label: 'Administradora Gama (Demo)' })
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Vínculo atualizado.')).toBeVisible()

  await page.reload()
  await expect(page.locator('#trade_name')).toHaveValue(name)
  await expect(page.locator('#legal_name')).toHaveValue('Razão Social E2E Ltda (fictícia)')
  await expect(page.getByRole('link', { name: 'Administradora Gama (Demo)' })).toBeVisible()
  await expectClean(issues)
})

test('proprietário edita administradora e o valor persiste', async ({ page }) => {
  await login(page, 'owner')
  await page.goto('/admin/administradoras')
  await page.getByRole('link', { name: 'Administradora Gama (Demo)' }).click()
  const phone = `(11) 9${String(Date.now()).slice(-8)}`
  await page.locator('#phone').fill(phone)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Alterações salvas.')).toBeVisible()
  await page.reload()
  await expect(page.locator('#phone')).toHaveValue(phone)
})
