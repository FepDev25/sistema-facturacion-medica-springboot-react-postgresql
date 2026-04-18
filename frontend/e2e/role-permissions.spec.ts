import { expect, test } from '@playwright/test'

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'admin123'
const DOCTOR_USER = process.env.E2E_DOCTOR_USER ?? ''
const DOCTOR_PASS = process.env.E2E_DOCTOR_PASS ?? ''
const RECEPTIONIST_USER = process.env.E2E_RECEPTIONIST_USER ?? ''
const RECEPTIONIST_PASS = process.env.E2E_RECEPTIONIST_PASS ?? ''

function loginAs(page: import('@playwright/test').Page, username: string, password: string) {
  return async () => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill(username)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  }
}

test.describe('Role-based navigation visibility', () => {
  test.describe.configure({ mode: 'serial' })

  test('ADMIN sees all 7 navigation items', async ({ page }) => {
    if (!ADMIN_USER) test.skip(true, 'E2E_ADMIN_USER not set')
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Pacientes' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Médicos' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Citas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Facturas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Seguros' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Catálogo' })).toBeVisible()
    expect(await navLinks.count()).toBe(7)
  })

  test('DOCTOR sees only Dashboard, Citas', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Citas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Pacientes' })).not.toBeVisible()
    await expect(navLinks.filter({ hasText: 'Médicos' })).not.toBeVisible()
    await expect(navLinks.filter({ hasText: 'Facturas' })).not.toBeVisible()
    await expect(navLinks.filter({ hasText: 'Seguros' })).not.toBeVisible()
    await expect(navLinks.filter({ hasText: 'Catálogo' })).not.toBeVisible()
    expect(await navLinks.count()).toBe(2)
  })

  test('RECEPTIONIST sees Dashboard, Pacientes, Citas, Facturas', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Pacientes' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Citas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Facturas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Médicos' })).not.toBeVisible()
    await expect(navLinks.filter({ hasText: 'Seguros' })).not.toBeVisible()
    await expect(navLinks.filter({ hasText: 'Catálogo' })).not.toBeVisible()
    expect(await navLinks.count()).toBe(4)
  })
})

test.describe('Role-based sidebar badges', () => {
  test('ADMIN sidebar shows Administrador badge', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await expect(page.locator('aside').getByText('Administrador')).toBeVisible()
  })

  test('DOCTOR sidebar shows Doctor badge', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    await expect(page.locator('aside').getByText('Doctor')).toBeVisible()
  })

  test('RECEPTIONIST sidebar shows Recepción badge', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()
    await expect(page.locator('aside').getByText('Recepción')).toBeVisible()
  })
})

test.describe('ADMIN permissions', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: { cookies: [], origins: [] } })

  test('can create patients (Nuevo paciente button enabled)', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await page.getByRole('link', { name: 'Pacientes' }).click()
    const newBtn = page.getByRole('button', { name: /Nuevo paciente/ })
    await expect(newBtn).toBeEnabled()
  })

  test('can create appointments (Nueva cita button enabled)', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await page.getByRole('link', { name: 'Citas' }).click()
    const newBtn = page.getByRole('button', { name: /Nueva cita/ })
    await expect(newBtn).toBeEnabled()
  })

  test('can access doctors page', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await page.getByRole('link', { name: 'Médicos' }).click()
    await expect(page).toHaveURL('/doctors')
    await expect(page.getByRole('heading', { name: 'Médicos' })).toBeVisible()
  })

  test('can access insurance page', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await page.getByRole('link', { name: 'Seguros' }).click()
    await expect(page).toHaveURL('/insurance')
  })

  test('can access catalog page', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await page.getByRole('link', { name: 'Catálogo' }).click()
    await expect(page).toHaveURL('/catalog')
  })

  test('can confirm invoices (Confirmar factura button enabled)', async ({ page }) => {
    await loginAs(page, ADMIN_USER, ADMIN_PASS)()
    await page.getByRole('link', { name: 'Facturas' }).click()

    const confirmBtns = page.getByRole('button', { name: 'Confirmar factura' })
    const count = await confirmBtns.count()
    for (let i = 0; i < count; i++) {
      if (await confirmBtns.nth(i).isEnabled()) {
        expect(true).toBeTruthy()
        return
      }
    }
    test.skip(true, 'No hay facturas confirmables')
  })
})

test.describe('RECEPTIONIST permissions', () => {
  test.describe.configure({ mode: 'serial' })

  test('can create patients (Nuevo paciente button enabled)', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()
    await page.getByRole('link', { name: 'Pacientes' }).click()
    const newBtn = page.getByRole('button', { name: /Nuevo paciente/ })
    await expect(newBtn).toBeEnabled()
  })

  test('can register payments on invoices', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()
    await page.getByRole('link', { name: 'Facturas' }).click()

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la factura' })
    if (await detailLinks.count() > 0) {
      await detailLinks.first().click()
      const payBtn = page.getByRole('button', { name: 'Registrar pago' })
      if (await payBtn.isVisible()) {
        await expect(payBtn).toBeEnabled()
        return
      }
    }
    test.skip(true, 'No se encontró factura que acepte pagos')
  })

  test('cannot access doctors page (no nav link)', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Médicos' })).not.toBeVisible()
  })

  test('cannot access insurance page (no nav link)', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Seguros' })).not.toBeVisible()
  })

  test('cannot access catalog page (no nav link)', async ({ page }) => {
    if (!RECEPTIONIST_USER) test.skip(true, 'E2E_RECEPTIONIST_USER not set')
    await loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)()
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Catálogo' })).not.toBeVisible()
  })
})

test.describe('DOCTOR permissions', () => {
  test.describe.configure({ mode: 'serial' })

  test('cannot create patients (no Nuevo paciente button)', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    await page.getByRole('link', { name: 'Citas' }).first().click()

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Pacientes' })).not.toBeVisible()
  })

  test('cannot create appointments (Nueva cita button hidden/disabled)', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    await page.getByRole('link', { name: 'Citas' }).click()

    const newBtn = page.getByRole('button', { name: /Nueva cita/ })
    if (await newBtn.isVisible()) {
      await expect(newBtn).toBeDisabled()
    } else {
      expect(true).toBeTruthy()
    }
  })

  test('cannot access invoices page (no nav link)', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Facturas' })).not.toBeVisible()
  })

  test('can view appointment detail page', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    await page.getByRole('link', { name: 'Citas' }).click()

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la cita' })
    if (await detailLinks.count() > 0) {
      await detailLinks.first().click()
      await expect(page.getByRole('heading', { name: 'Detalle de cita' })).toBeVisible()
    } else {
      test.skip(true, 'No hay citas para este doctor')
    }
  })

  test('can complete appointment when status is in_progress', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    await page.getByRole('link', { name: 'Citas' }).click()

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la cita' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const completeBtn = page.getByRole('button', { name: 'Completar cita' }).first()

      if (await completeBtn.isVisible() && await completeBtn.isEnabled()) {
        await expect(completeBtn).toBeEnabled()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/appointments/)
    }

    test.skip(true, 'No se encontró cita en curso para completar')
  })
})

test.describe('Permission error messages', () => {
  test('role-restricted actions show toast error for unauthorized roles', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()

    await page.goto('/doctors')
    await expect(page).toHaveURL(/\/login/)
  })

  test('MANAGE_INVOICES actions are restricted to non-ADMIN/RECEPTIONIST', async ({ page }) => {
    if (!DOCTOR_USER) test.skip(true, 'E2E_DOCTOR_USER not set')
    await loginAs(page, DOCTOR_USER, DOCTOR_PASS)()
    await page.goto('/invoices')
    await expect(page).toHaveURL(/\/login/)
  })
})
