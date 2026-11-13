import { expect, test } from '@playwright/test'
import {
  E2E,
  loginAsAdmin,
  loginAsDoctor,
  loginAsReceptionist,
  openAppointmentById,
  openInvoiceByNumber,
} from './fixtures'

test.describe('Role-based navigation visibility', () => {
  test.describe.configure({ mode: 'serial' })

  test('ADMIN sees all 8 navigation items', async ({ page }) => {
    await loginAsAdmin(page)

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Pacientes' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Médicos' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Citas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Facturas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Seguros' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Catálogo' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'AI Lab' })).toBeVisible()
    expect(await navLinks.count()).toBe(8)
  })

  test('DOCTOR sees only Dashboard, Citas', async ({ page }) => {
    await loginAsDoctor(page)

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
    await loginAsReceptionist(page)

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
    await loginAsAdmin(page)
    await expect(page.locator('aside').getByText('Administrador')).toBeVisible()
  })

  test('DOCTOR sidebar shows Doctor badge', async ({ page }) => {
    await loginAsDoctor(page)
    await expect(page.locator('aside').getByText('Doctor').first()).toBeVisible()
  })

  test('RECEPTIONIST sidebar shows Recepción badge', async ({ page }) => {
    await loginAsReceptionist(page)
    await expect(page.locator('aside').getByText('Recepción')).toBeVisible()
  })
})

test.describe('ADMIN permissions', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ storageState: { cookies: [], origins: [] } })

  test('can create patients (Nuevo paciente button enabled)', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Pacientes' }).click()
    const newBtn = page.getByRole('button', { name: /Nuevo paciente/ })
    await expect(newBtn).toBeEnabled()
  })

  test('can create appointments (Nueva cita button enabled)', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Citas' }).click()
    const newBtn = page.getByRole('button', { name: /Nueva cita/ })
    await expect(newBtn).toBeEnabled()
  })

  test('can access doctors page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Médicos' }).click()
    await expect(page).toHaveURL('/doctors')
    await expect(page.getByRole('heading', { name: 'Médicos' })).toBeVisible()
  })

  test('can access insurance page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Seguros' }).click()
    await expect(page).toHaveURL('/insurance')
  })

  test('can access catalog page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Catálogo' }).click()
    await expect(page).toHaveURL('/catalog')
  })

  test('can confirm invoices (Confirmar factura button enabled)', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoiceByNumber(page, E2E.addItemInvoice)

    await expect(page.getByRole('button', { name: 'Confirmar factura' })).toBeEnabled()
  })
})

test.describe('RECEPTIONIST permissions', () => {
  test.describe.configure({ mode: 'serial' })

  test('can create patients (Nuevo paciente button enabled)', async ({ page }) => {
    await loginAsReceptionist(page)
    await page.locator('aside nav').getByRole('link', { name: 'Pacientes' }).click()
    const newBtn = page.getByRole('button', { name: /Nuevo paciente/ })
    await expect(newBtn).toBeEnabled()
  })

  test('can register payments on invoices', async ({ page }) => {
    await loginAsReceptionist(page)
    await openInvoiceByNumber(page, E2E.payableInvoice)

    await expect(page.getByRole('button', { name: 'Registrar pago' })).toBeEnabled()
  })

  test('cannot access doctors page (no nav link)', async ({ page }) => {
    await loginAsReceptionist(page)
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Médicos' })).not.toBeVisible()
  })

  test('cannot access insurance page (no nav link)', async ({ page }) => {
    await loginAsReceptionist(page)
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Seguros' })).not.toBeVisible()
  })

  test('cannot access catalog page (no nav link)', async ({ page }) => {
    await loginAsReceptionist(page)
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Catálogo' })).not.toBeVisible()
  })
})

test.describe('DOCTOR permissions', () => {
  test.describe.configure({ mode: 'serial' })

  test('cannot create patients (no Nuevo paciente button)', async ({ page }) => {
    await loginAsDoctor(page)
    await page.locator('aside nav').getByRole('link', { name: 'Citas' }).click()

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Pacientes' })).not.toBeVisible()
  })

  test('cannot create appointments (Nueva cita button hidden/disabled)', async ({ page }) => {
    await loginAsDoctor(page)
    await page.locator('aside nav').getByRole('link', { name: 'Citas' }).click()

    const newBtn = page.getByRole('button', { name: /Nueva cita/ })
    if (await newBtn.isVisible()) {
      await expect(newBtn).toBeDisabled()
    } else {
      expect(true).toBeTruthy()
    }
  })

  test('cannot access invoices page (no nav link)', async ({ page }) => {
    await loginAsDoctor(page)
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Facturas' })).not.toBeVisible()
  })

  test('can view appointment detail page', async ({ page }) => {
    await loginAsDoctor(page)
    await openAppointmentById(page, E2E.completedAppointmentId)

    await expect(page.getByRole('heading', { name: 'Detalle de cita' })).toBeVisible()
  })

  test('can complete appointment when status is in_progress', async ({ page }) => {
    await loginAsDoctor(page)
    await openAppointmentById(page, E2E.inProgressAppointmentId)

    await expect(page.getByRole('button', { name: 'Completar cita' }).first()).toBeEnabled()
  })
})

test.describe('Permission error messages', () => {
  test('role-restricted actions show toast error for unauthorized roles', async ({ page }) => {
    await loginAsDoctor(page)

    await page.goto('/doctors')
    // Autenticado pero sin rol: requireRole muestra la página 403.
    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.getByRole('heading', { name: 'No tienes permisos' })).toBeVisible()
  })

  test('MANAGE_INVOICES actions are restricted to non-ADMIN/RECEPTIONIST', async ({ page }) => {
    await loginAsDoctor(page)
    await page.goto('/invoices')
    // Autenticado pero sin rol: requireRole muestra la página 403.
    await expect(page).toHaveURL(/\/forbidden/)
    await expect(page.getByRole('heading', { name: 'No tienes permisos' })).toBeVisible()
  })
})
