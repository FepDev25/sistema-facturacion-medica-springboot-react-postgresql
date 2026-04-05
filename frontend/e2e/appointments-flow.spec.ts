import { expect, test } from '@playwright/test'

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'admin123'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(ADMIN_USER)
  await page.getByLabel('Contraseña').fill(ADMIN_PASS)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/(dashboard)?$/)
}

async function clickFirstEnabled(locator: import('@playwright/test').Locator): Promise<boolean> {
  const total = await locator.count()
  for (let i = 0; i < total; i += 1) {
    const candidate = locator.nth(i)
    if (await candidate.isVisible() && await candidate.isEnabled()) {
      await candidate.click()
      return true
    }
  }

  return false
}

async function openAppointments(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Citas', exact: true }).first().click()
  await expect(page).toHaveURL(/\/appointments/)
}

async function openFirstAppointmentDetail(page: import('@playwright/test').Page) {
  const detailLinks = page.getByRole('link', { name: 'Ver detalle de la cita' })
  await expect(detailLinks.first()).toBeVisible()
  await detailLinks.first().click()
  await expect(page).toHaveURL(/\/appointments\//)
  await expect(page.getByRole('heading', { name: 'Detalle de cita' })).toBeVisible()
}

test.describe('Appointments UI critical flow', () => {
  test('can confirm or start/cancel without frontend blocking errors', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const confirmButtons = page.getByRole('button', { name: 'Confirmar cita' })
    const startButtons = page.getByRole('button', { name: 'Iniciar cita' })
    const cancelButtons = page.getByRole('button', { name: 'Cancelar cita' })

    if (await clickFirstEnabled(confirmButtons)) {
      await expect(page.getByText('Cita confirmada')).toBeVisible()
      return
    }

    if (await clickFirstEnabled(startButtons)) {
      await expect(page.getByText('Cita iniciada')).toBeVisible()
      return
    }

    if (await clickFirstEnabled(cancelButtons)) {
      await expect(page.getByText(/Cita cancelada|Error al cancelar la cita/)).toBeVisible()
      return
    }

    test.skip(true, 'No hay citas accionables en el dataset actual')
  })

  test('detail page shows state flow and no UI crash', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    await expect(page.getByText('AppointmentStatusFlow')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  })

  test('complete appointment button visibility is role-state consistent', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    const completeButton = page.getByRole('button', { name: 'Completar cita' })
    const statusBadge = page.locator('text=Estado').first()

    await expect(statusBadge).toBeVisible()

    if (await completeButton.isVisible()) {
      await expect(completeButton).toBeDisabled()
    }
  })
})
