import { expect, test } from '@playwright/test'
import { E2E, loginAsAdmin, openInvoiceByNumber, openInvoices } from './fixtures'

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
    await expect(headers.filter({ hasText: 'Factura' }).first()).toBeVisible()
    await expect(headers.filter({ hasText: 'Paciente' }).first()).toBeVisible()
    await expect(headers.filter({ hasText: 'Estado' }).first()).toBeVisible()
    await expect(headers.filter({ hasText: 'Vencimiento' }).first()).toBeVisible()
  })

  test('table has action buttons for each row', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const eyeButtons = page.getByRole('link', { name: 'Ver detalle de la factura' })
    await expect(eyeButtons.first()).toBeVisible()
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
    const pendingOption = page.getByRole('option', { name: 'Pendiente' }).first()
    if (await pendingOption.isVisible()) {
      await pendingOption.click()
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

    const table = page.getByRole('table')
    await expect(
      table.getByText(/Borrador|Pendiente|Pago parcial|Pagada|Cancelada|Vencida/).first(),
    ).toBeVisible()
    const statusLabels = ['Borrador', 'Pendiente', 'Pago parcial', 'Pagada', 'Vencida']
    const foundLabels: string[] = []

    for (const label of statusLabels) {
      if (await table.getByText(label, { exact: true }).first().isVisible()) {
        foundLabels.push(label)
      }
    }

    expect(foundLabels.length).toBeGreaterThan(0)
  })

  test('confirm action opens AlertDialog', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const row = page.getByRole('row').filter({ hasText: E2E.draftInvoice })
    const btn = row.getByRole('button', { name: 'Confirmar factura' })
    await expect(btn).toBeEnabled()
    await btn.click()

    await expect(page.getByText(/Se confirmará la factura/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toBeVisible()
  })

  test('cancel action opens AlertDialog', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)

    const row = page.getByRole('row').filter({ hasText: E2E.cancellableInvoice })
    const btn = row.getByRole('button', { name: 'Cancelar factura' })
    await expect(btn).toBeEnabled()
    await btn.click()

    await expect(page.getByText(/Se cancelará la factura/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible()
  })
})

test.describe('Invoice detail page', () => {
  test('renders invoice number as heading', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoices(page)
    await openFirstInvoiceDetail(page)

    const heading = page.locator('main').getByRole('heading', { level: 1 })
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
    await expect(page.getByText('Emisión')).toBeVisible()
    await expect(page.getByText('Vencimiento').first()).toBeVisible()
    await expect(page.getByText('Subtotal')).toBeVisible()
    await expect(page.getByText('Impuestos')).toBeVisible()
    await expect(page.getByText('Total').first()).toBeVisible()
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

    await expect(page.getByRole('heading', { name: 'Pagos registrados' })).toBeVisible()
  })

  test('shows empty message when no payments', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoiceByNumber(page, E2E.emptyPaymentsInvoice)

    await expect(page.getByText('No hay pagos registrados para esta factura.')).toBeVisible()
  })

  test('Registrar pago button opens payment drawer', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoiceByNumber(page, E2E.payableInvoice)

    const payButton = page.getByRole('button', { name: 'Registrar pago' })
    await expect(payButton).toBeEnabled()
    await payButton.click()

    await expect(page.getByRole('heading', { name: 'Registrar pago' })).toBeVisible()
    await expect(page.getByLabel('Monto')).toBeVisible()
    await expect(page.getByLabel('Método de pago')).toBeVisible()
  })

  test('Confirmar factura button is visible for draft invoices', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoiceByNumber(page, E2E.addItemInvoice)

    await expect(page.getByRole('button', { name: 'Confirmar factura' })).toBeVisible()
  })

  test('Agregar item button is visible for draft invoices', async ({ page }) => {
    await loginAsAdmin(page)
    await openInvoiceByNumber(page, E2E.addItemInvoice)

    const addItemBtn = page.getByRole('button', { name: 'Agregar item' })
    await expect(addItemBtn).toBeVisible()
    await addItemBtn.click()
    await expect(page.getByRole('heading', { name: 'Agregar item' })).toBeVisible()
    await expect(page.getByLabel('Tipo de item')).toBeVisible()
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

test.describe('Insurance coverage and payment', () => {
  test('póliza 80 %: pagar la responsabilidad del paciente deja la factura PAID', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await openInvoiceByNumber(page, E2E.policyInvoice)

    await expect(page.getByText(E2E.policyNumber)).toBeVisible()
    await expect(page.getByText(/Seguro \(80\.0%\)/)).toBeVisible()
    await expect(page.getByText(/Paciente \(20\.0%\)/)).toBeVisible()
    await expect(page.getByText(/232\.00/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Registrar pago' }).click()
    await expect(page.getByRole('heading', { name: 'Registrar pago' })).toBeVisible()

    const payTotal = page.getByRole('button', { name: /Pagar total/ })
    await expect(payTotal).toBeVisible()
    await payTotal.click()
    await page.getByRole('button', { name: 'Registrar pago' }).last().click()

    await expect(page.getByText('Pago registrado')).toBeVisible()
    await expect(page.getByText('Pagada').first()).toBeVisible()
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
