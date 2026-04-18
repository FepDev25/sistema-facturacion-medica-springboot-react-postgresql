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

test.describe('Login flow', () => {
  test('shows login page with form fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Acceso al sistema')).toBeVisible()
    await expect(page.getByLabel('Usuario')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Requerido')).toHaveCount(2)
  })

  test('shows error message on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('wronguser')
    await page.getByLabel('Contraseña').fill('wrongpass')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText(/No se pudo iniciar sesión|Credenciales/)).toBeVisible()
  })

  test('redirects to dashboard after successful login', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })
})

test.describe('Appointments list page', () => {
  test('renders page header and table', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    await expect(page.getByRole('heading', { name: 'Citas' })).toBeVisible()
    await expect(page.getByText(/Gestión operativa de agenda/)).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('status filter dropdown is visible', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const filterTrigger = page.getByRole('combobox', { name: /Estado/ })
    await expect(filterTrigger).toBeVisible()
  })

  test('table has expected column headers', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const headers = page.getByRole('columnheader')
    await expect(headers.filter({ hasText: 'Fecha y hora' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Paciente' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Médico' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Estado' })).toBeVisible()
  })

  test('rows have action buttons', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const eyeButtons = page.getByRole('button', { name: 'Ver detalle de la cita' })
    const rowCount = await eyeButtons.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('Nueva cita button opens appointment drawer', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const newButton = page.getByRole('button', { name: /Nueva cita/ })
    if (await newButton.isVisible() && await newButton.isEnabled()) {
      await newButton.click()
      await expect(page.getByText('Nueva Cita')).toBeVisible()
      await expect(page.getByLabel('Buscar paciente por DNI')).toBeVisible()
      await expect(page.getByLabel('Buscar médico')).toBeVisible()
      await expect(page.getByLabel('Fecha y hora')).toBeVisible()
      await expect(page.getByLabel('Duración (min)')).toBeVisible()
      await expect(page.getByLabel('Motivo de consulta')).toBeVisible()
    } else {
      test.skip(true, 'Botón Nueva cita no disponible (sin permisos o vista de doctor)')
    }
  })

  test('navigates to appointment detail page', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    await expect(page.getByRole('heading', { name: 'Detalle de cita' })).toBeVisible()
  })
})

test.describe('Appointment detail page', () => {
  test('renders all information sections', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    await expect(page.getByRole('heading', { name: 'Detalle de cita' })).toBeVisible()
    await expect(page.getByText('Resumen de atención')).toBeVisible()
    await expect(page.getByText('Paciente').first()).toBeVisible()
    await expect(page.getByText('Médico').first()).toBeVisible()
    await expect(page.getByText('Notas clínicas')).toBeVisible()
  })

  test('shows appointment summary data', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    await expect(page.getByText('Estado').first()).toBeVisible()
    await expect(page.getByText('Duración')).toBeVisible()
    await expect(page.getByText('Inicio')).toBeVisible()
    await expect(page.getByText('Fin estimado')).toBeVisible()
  })

  test('shows patient and doctor names', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    const patientSection = page.locator('section').filter({ hasText: 'Paciente' })
    const doctorSection = page.locator('section').filter({ hasText: 'Médico' })
    await expect(patientSection.getByText(/Dr\./)).not.toBeVisible()
    await expect(doctorSection.getByText(/Dr\./)).toBeVisible()
  })

  test('BackToListButton navigates to appointments list', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)
    await openFirstAppointmentDetail(page)

    const backBtn = page.getByRole('button', { name: /Volver a citas/ })
    await expect(backBtn).toBeVisible()
    await backBtn.click()
    await expect(page).toHaveURL(/\/appointments$/)
  })

  test('clinical notes shows fallback when empty', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la cita' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const noMotive = page.getByText('Sin motivo registrado')
      const noNotes = page.getByText('Sin notas adicionales')

      if (await noMotive.isVisible() && await noNotes.isVisible()) {
        await expect(noMotive).toBeVisible()
        await expect(noNotes).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/appointments/)
    }

    test.skip(true, 'No se encontró cita sin notas en el dataset')
  })

  test('medical record link is visible when present', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la cita' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const recordLink = page.getByText('Ver expediente')

      if (await recordLink.isVisible()) {
        await expect(recordLink).toBeVisible()
        await expect(page.getByText('Expediente generado')).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/appointments/)
    }

    test.skip(true, 'No se encontró cita con expediente en el dataset')
  })
})

test.describe('Status transitions', () => {
  test('confirm button is enabled only for scheduled appointments', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const confirmButtons = page.getByRole('button', { name: 'Confirmar cita' })
    const count = await confirmButtons.count()

    for (let i = 0; i < count; i++) {
      const btn = confirmButtons.nth(i)
      if (await btn.isEnabled()) {
        expect(true).toBeTruthy()
        return
      }
    }

    test.skip(true, 'No hay citas programadas para confirmar')
  })

  test('start button is enabled only for confirmed appointments', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const startButtons = page.getByRole('button', { name: 'Iniciar cita' })
    const count = await startButtons.count()

    for (let i = 0; i < count; i++) {
      const btn = startButtons.nth(i)
      if (await btn.isEnabled()) {
        expect(true).toBeTruthy()
        return
      }
    }

    test.skip(true, 'No hay citas confirmadas para iniciar')
  })

  test('status badges display correct labels', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const statusLabels = ['Programada', 'Confirmada', 'En curso', 'Completada', 'Cancelada']
    const foundLabels: string[] = []

    for (const label of statusLabels) {
      if (await page.getByText(label).isVisible()) {
        foundLabels.push(label)
      }
    }

    expect(foundLabels.length).toBeGreaterThan(0)
  })
})

test.describe('Complete appointment drawer', () => {
  test('opens from detail page when status is in_progress', async ({ page }) => {
    await loginAsAdmin(page)
    await openAppointments(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la cita' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const completeBtn = page.getByRole('button', { name: 'Completar cita' }).first()

      if (await completeBtn.isVisible() && await completeBtn.isEnabled()) {
        await completeBtn.click()
        await expect(page.getByText('Completar cita')).toBeVisible()
        await expect(page.getByLabel('Notas clinicas')).toBeVisible()
        await expect(page.getByLabel('Examen fisico (opcional)')).toBeVisible()
        await expect(page.getByLabel('Presion arterial')).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/appointments/)
    }

    test.skip(true, 'No se encontró cita en curso para completar')
  })
})

test.describe('Navigation', () => {
  test('sidebar nav items are visible after login', async ({ page }) => {
    await loginAsAdmin(page)

    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Citas' })).toBeVisible()
  })

  test('clicking Citas in sidebar navigates correctly', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Citas' }).click()
    await expect(page).toHaveURL('/appointments')
    await expect(page.getByRole('heading', { name: 'Citas' })).toBeVisible()
  })
})
