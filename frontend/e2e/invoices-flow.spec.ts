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

async function openInvoices(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Facturas', exact: true }).first().click()
  await expect(page).toHaveURL('/invoices')
}

async function openFirstInvoiceDetail(page: import('@playwright/test').Page) {
  const detailLinks = page.getByRole('link', { name: 'Ver detalle de la factura' })
  await expect(detailLinks.first()).toBeVisible()
  await detailLinks.first().click()
  await expect(page).toHaveURL(/\/invoices\//)
}

test.describe('Invoices list page', () => {
  test('renders page header and description', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    await expect(page.getByRole('heading', { name: 'Facturas' })).toBeVisible()
    await expect(page.getByText(/Control de facturación/)).toBeVisible()
  })

  test('renders table with column headers', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const headers = page.getByRole('columnheader')
    await expect(headers.filter({ hasText: 'Factura' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Paciente' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Estado' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Vencimiento' })).toBeVisible()
  })

  test('table has action buttons for each row', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const eyeButtons = page.getByRole('link', { name: 'Ver detalle de la factura' })
    const count = await eyeButtons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('status filter dropdown is visible', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    await expect(page.getByRole('combobox', { name: /Estado/ })).toBeVisible()
  })

  test('date range filters are visible', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    await expect(page.getByText('Desde:')).toBeVisible()
    await expect(page.getByText('Hasta:')).toBeVisible()
    await expect(page.locator('input[type="date"]').first()).toBeVisible()
  })

  test('Limpiar filtros button appears after applying a filter', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    await expect(page.getByRole('button', { name: 'Limpiar filtros' })).not.toBeVisible()

    const statusSelect = page.getByRole('combobox', { name: /Estado/ })
    await statusSelect.click()
    const firstOption = page.getByRole('option').first()
    if (await firstOption.isVisible()) {
      await firstOption.click()
      await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible()
    }
  })

  test('navigates to invoice detail page', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    await expect(page).toHaveURL(/\/invoices\//)
  })

  test('invoice status badges display correct labels', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const statusLabels = ['Borrador', 'Pendiente', 'Pago parcial', 'Pagada', 'Vencida']
    const foundLabels: string[] = []

    for (const label of statusLabels) {
      if (await page.getByText(label).isVisible()) {
        foundLabels.push(label)
      }
    }

    expect(foundLabels.length).toBeGreaterThan(0)
  })

  test('confirm action opens AlertDialog', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const confirmButtons = page.getByRole('button', { name: 'Confirmar factura' })
    const count = await confirmButtons.count()

    for (let i = 0; i < count; i++) {
      const btn = confirmButtons.nth(i)
      if (await btn.isEnabled()) {
        await btn.click()
        await expect(page.getByText('Confirmar factura')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible()

        await page.getByRole('button', { name: 'Cancelar' }).click()
        return
      }
    }

    test.skip(true, 'No hay facturas en borrador para confirmar')
  })

  test('cancel action opens AlertDialog', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const cancelButtons = page.getByRole('button', { name: 'Cancelar factura' })
    const count = await cancelButtons.count()

    for (let i = 0; i < count; i++) {
      const btn = cancelButtons.nth(i)
      if (await btn.isEnabled()) {
        await btn.click()
        await expect(page.getByText('Cancelar factura')).toBeVisible()
        await expect(page.getByText(/Se cancelara la factura/)).toBeVisible()

        await page.getByRole('button', { name: 'Cancelar' }).click()
        return
      }
    }

    test.skip(true, 'No hay facturas cancelables')
  })
})

test.describe('Invoice detail page', () => {
  test('renders invoice number as heading', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    const headingText = await heading.textContent()
    expect(headingText?.trim().length).toBeGreaterThan(0)
  })

  test('renders subtitle with billing text', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    await expect(page.getByText('Detalle de factura y cobranza')).toBeVisible()
  })

  test('shows financial summary section', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    await expect(page.getByText('Resumen financiero')).toBeVisible()
    await expect(page.getByText('Estado').first()).toBeVisible()
    await expect(page.getByText('Emision')).toBeVisible()
    await expect(page.getByText('Vencimiento').first()).toBeVisible()
    await expect(page.getByText('Subtotal')).toBeVisible()
    await expect(page.getByText('Impuestos')).toBeVisible()
    await expect(page.getByText('Total')).toBeVisible()
    await expect(page.getByText('Cobertura seguro')).toBeVisible()
    await expect(page.getByText('Responsabilidad paciente')).toBeVisible()
    await expect(page.getByText('Pagado')).toBeVisible()
    await expect(page.getByText('Saldo')).toBeVisible()
  })

  test('total is displayed with currency format', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    const currencyValues = page.locator('text=$')
    await expect(currencyValues.first()).toBeVisible()
  })

  test('shows InvoiceCoverageBar component', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    const coverageSection = page.getByText(/Cobertura|Seguro|Paciente/)
    await expect(coverageSection.first()).toBeVisible()
  })

  test('shows patient and coverage section', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    await expect(page.getByText('Paciente y cobertura')).toBeVisible()
  })

  test('shows invoiced items section', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    await expect(page.getByText('Items facturados')).toBeVisible()
  })

  test('shows payments section', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    await expect(page.getByText('Pagos registrados')).toBeVisible()
  })

  test('shows empty message when no payments', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la factura' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const noPayments = page.getByText('No hay pagos registrados para esta factura.')

      if (await noPayments.isVisible()) {
        await expect(noPayments).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/invoices/)
    }

    test.skip(true, 'No se encontró factura sin pagos')
  })

  test('Registrar pago button opens payment drawer', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la factura' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const payButton = page.getByRole('button', { name: 'Registrar pago' })

      if (await payButton.isVisible() && await payButton.isEnabled()) {
        await payButton.click()
        await expect(page.getByText('Registrar pago')).toBeVisible()
        await expect(page.getByLabel('Monto')).toBeVisible()
        await expect(page.getByLabel('Metodo de pago')).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/invoices/)
    }

    test.skip(true, 'No se encontró factura que acepte pagos')
  })

  test('Confirmar factura button is visible for draft invoices', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la factura' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const confirmBtn = page.getByRole('button', { name: 'Confirmar factura' })

      if (await confirmBtn.isVisible()) {
        await expect(confirmBtn).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/invoices/)
    }

    test.skip(true, 'No se encontró factura en borrador')
  })

  test('Agregar item button is visible for draft invoices', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const detailLinks = page.getByRole('link', { name: 'Ver detalle de la factura' })
    const count = await detailLinks.count()

    for (let i = 0; i < count; i++) {
      await detailLinks.first().click()
      const addItemBtn = page.getByRole('button', { name: 'Agregar item' })

      if (await addItemBtn.isVisible()) {
        await expect(addItemBtn).toBeVisible()
        await addItemBtn.click()
        await expect(page.getByText('Agregar item')).toBeVisible()
        await expect(page.getByLabel('Tipo de item')).toBeVisible()
        return
      }

      await page.goBack()
      await expect(page).toHaveURL(/\/invoices/)
    }

    test.skip(true, 'No se encontró factura en borrador')
  })

  test('BackToListButton returns to invoices list', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    const backBtn = page.getByRole('button', { name: /Volver a facturas/ })
    await expect(backBtn).toBeVisible()
    await backBtn.click()
    await expect(page).toHaveURL(/\/invoices$/)
  })
})

test.describe('Navigation', () => {
  test('sidebar link navigates to invoices page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Facturas' }).click()
    await expect(page).toHaveURL('/invoices')
    await expect(page.getByRole('heading', { name: 'Facturas' })).toBeVisible()
  })

  test('invoices link is active when on invoices page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Facturas' }).click()
    await expect(page).toHaveURL('/invoices')

    const activeLink = page.locator('aside nav').getByRole('link', { name: 'Facturas' })
    await expect(activeLink).toHaveClass(/bg-primary/)
  })
})
