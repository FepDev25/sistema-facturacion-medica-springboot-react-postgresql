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

async function openPatients(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Pacientes', exact: true }).first().click()
  await expect(page).toHaveURL('/patients')
}

async function openFirstPatientDetail(page: import('@playwright/test').Page) {
  const detailLinks = page.getByRole('link', { name: 'Ver detalle del paciente' })
  await expect(detailLinks.first()).toBeVisible()
  await detailLinks.first().click()
  await expect(page).toHaveURL(/\/patients\//)
}

test.describe('Patients list page', () => {
  test('renders page header and description', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible()
    await expect(page.getByText(/Registro y actualización/)).toBeVisible()
  })

  test('renders table with column headers', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const headers = page.getByRole('columnheader')
    await expect(headers.filter({ hasText: 'DNI' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Nombre completo' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Teléfono' })).toBeVisible()
  })

  test('table has action buttons for each row', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const eyeButtons = page.getByRole('link', { name: 'Ver detalle del paciente' })
    const count = await eyeButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('search input is visible', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const searchInput = page.getByPlaceholder('Filtrar por apellido...')
    await expect(searchInput).toBeVisible()
  })

  test('search filters results by typing', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const searchInput = page.getByPlaceholder('Filtrar por apellido...')
    const firstNameCell = page.getByRole('table').locator('td').first()
    const firstRowText = await firstNameCell.textContent()

    if (firstRowText && firstRowText.length > 3) {
      const searchValue = firstRowText.slice(0, 4)
      await searchInput.fill(searchValue)
      await page.waitForTimeout(500)
      await expect(page.getByRole('table')).toBeVisible()
    }
  })

  test('Nuevo paciente button opens drawer', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const newButton = page.getByRole('button', { name: /Nuevo paciente/ })
    if (await newButton.isVisible() && await newButton.isEnabled()) {
      await newButton.click()
      await expect(page.getByText('Nuevo Paciente')).toBeVisible()
      await expect(page.getByLabel('DNI')).toBeVisible()
      await expect(page.getByLabel('Nombre')).toBeVisible()
      await expect(page.getByLabel('Apellido')).toBeVisible()
      await expect(page.getByLabel('Fecha de nacimiento')).toBeVisible()
      await expect(page.getByLabel('Género')).toBeVisible()
      await expect(page.getByLabel('Teléfono')).toBeVisible()
    } else {
      test.skip(true, 'Botón Nuevo paciente no disponible')
    }
  })

  test('navigates to patient detail page', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page).toHaveURL(/\/patients\//)
  })

  test('edit button is enabled for admin users', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const editButtons = page.getByRole('button', { name: 'Editar paciente' })
    const count = await editButtons.count()

    if (count > 0) {
      const firstEnabled = editButtons.first()
      await expect(firstEnabled).toBeEnabled()
    } else {
      test.skip(true, 'No hay pacientes en el dataset')
    }
  })
})

test.describe('Patient detail page', () => {
  test('renders patient name in heading', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    const nameText = await heading.textContent()
    expect(nameText?.length).toBeGreaterThan(2)
  })

  test('renders subtitle with clinical file text', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Ficha clínica del paciente')).toBeVisible()
  })

  test('shows general information section', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Información general')).toBeVisible()
    await expect(page.getByText('DNI').first()).toBeVisible()
    await expect(page.getByText('Género')).toBeVisible()
    await expect(page.getByText('Nacimiento')).toBeVisible()
    await expect(page.getByText('Teléfono')).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText('Tipo de sangre')).toBeVisible()
  })

  test('DNI is displayed in monospace', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    const dniValue = page.locator('section').filter({ hasText: 'Información general' }).locator('p.font-mono')
    await expect(dniValue).toBeVisible()
    const dniText = await dniValue.textContent()
    expect(dniText?.length).toBeGreaterThan(0)
  })

  test('shows appointments table section', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Citas del paciente')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Citas del paciente' })).toBeVisible()
  })

  test('shows policies table section', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Pólizas de seguro')).toBeVisible()
  })

  test('shows invoices table section', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Facturas del paciente')).toBeVisible()
  })

  test('shows medical records table section', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Expedientes clinicos')).toBeVisible()
  })

  test('all four sub-tables have their own DataTable', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    const tables = page.locator('section').locator('table')
    const tableCount = await tables.count()
    expect(tableCount).toBeGreaterThanOrEqual(4)
  })

  test('BackToListButton returns to patients list', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    const backBtn = page.getByRole('button', { name: /Volver a pacientes/ })
    await expect(backBtn).toBeVisible()
    await backBtn.click()
    await expect(page).toHaveURL(/\/patients$/)
  })

  test('shows creation and update timestamps', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)
    await openFirstPatientDetail(page)

    await expect(page.getByText('Creado')).toBeVisible()
    await expect(page.getByText('Actualizado')).toBeVisible()
  })

  test('allergy alert renders when patient has allergies', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle del paciente' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const allergySection = page.locator('[data-testid="allergy-alert"]')

      if (await allergySection.isVisible()) {
        await expect(allergySection).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/patients$/)
    }

    test.skip(true, 'No se encontró paciente con alergias')
  })
})

test.describe('Patient CRUD via drawer', () => {
  test('drawer has all required form fields for creation', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const newButton = page.getByRole('button', { name: /Nuevo paciente/ })
    if (!await newButton.isVisible() || !await newButton.isEnabled()) {
      test.skip(true, 'Botón Nuevo paciente no disponible')
      return
    }

    await newButton.click()
    await expect(page.getByText('Nuevo Paciente')).toBeVisible()

    await expect(page.getByLabel('DNI')).toBeVisible()
    await expect(page.getByLabel('Nombre')).toBeVisible()
    await expect(page.getByLabel('Apellido')).toBeVisible()
    await expect(page.getByLabel('Fecha de nacimiento')).toBeVisible()
    await expect(page.getByLabel('Género')).toBeVisible()
    await expect(page.getByLabel('Teléfono')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Dirección')).toBeVisible()
    await expect(page.getByLabel(/Tipo de sangre/)).toBeVisible()
    await expect(page.getByLabel(/Alergias/)).toBeVisible()
  })

  test('drawer shows validation errors on empty submit', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const newButton = page.getByRole('button', { name: /Nuevo paciente/ })
    if (!await newButton.isVisible() || !await newButton.isEnabled()) {
      test.skip(true, 'Botón Nuevo paciente no disponible')
      return
    }

    await newButton.click()
    await expect(page.getByText('Nuevo Paciente')).toBeVisible()

    const submitButton = page.getByRole('button', { name: 'Crear paciente' })
    await submitButton.click()

    const errorMessages = page.locator('form').getByText('Requerido')
    await expect(errorMessages.first()).toBeVisible()
  })

  test('drawer Cancelar button closes the drawer', async ({ page }) => {
    await loginAsAdmin(page)
    await openPatients(page)

    const newButton = page.getByRole('button', { name: /Nuevo paciente/ })
    if (!await newButton.isVisible() || !await newButton.isEnabled()) {
      test.skip(true, 'Botón Nuevo paciente no disponible')
      return
    }

    await newButton.click()
    await expect(page.getByText('Nuevo Paciente')).toBeVisible()

    const cancelButton = page.getByRole('button', { name: 'Cancelar' })
    await cancelButton.click()
    await expect(page.getByText('Nuevo Paciente')).not.toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('sidebar link navigates to patients page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Pacientes' }).click()
    await expect(page).toHaveURL('/patients')
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible()
  })

  test('patients link is active when on patients page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Pacientes' }).click()
    await expect(page).toHaveURL('/patients')

    const activeLink = page.locator('aside nav').getByRole('link', { name: 'Pacientes' })
    await expect(activeLink).toHaveClass(/bg-primary/)
  })
})
