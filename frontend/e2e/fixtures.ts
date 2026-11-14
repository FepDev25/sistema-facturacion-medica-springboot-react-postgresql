import { expect, type Page } from '@playwright/test'

// Credenciales de los seeds (V7 y V8 de backend/src/main/resources/db). Se
// pueden sobrescribir por entorno, pero los defaults permiten correr la suite
// localmente sin variables adicionales.
export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin'
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'admin123'
export const DOCTOR_USER = process.env.E2E_DOCTOR_USER ?? 'doctor1'
export const DOCTOR_PASS = process.env.E2E_DOCTOR_PASS ?? 'doctor123'
export const RECEPTIONIST_USER = process.env.E2E_RECEPTIONIST_USER ?? 'recep1'
export const RECEPTIONIST_PASS = process.env.E2E_RECEPTIONIST_PASS ?? 'recep123'

// Datos deterministas de backend/src/main/resources/db/seeds/V14__e2e_scenarios.sql
export const E2E = {
  patientDni: '99999999',
  patientName: 'E2E Cobertura',
  policyNumber: 'POL-E2E-0001',
  policyInvoice: 'FAC-E2E-00001',
  policyInvoiceId: '60000000-0000-0000-0000-000000000099',
  payableInvoice: 'FAC-E2E-00002',
  payableInvoiceId: '60000000-0000-0000-0000-000000000098',
  draftInvoice: 'FAC-E2E-00003',
  draftInvoiceId: '60000000-0000-0000-0000-000000000097',
  emptyPaymentsInvoice: 'FAC-E2E-00004',
  emptyPaymentsInvoiceId: '60000000-0000-0000-0000-000000000096',
  addItemInvoice: 'FAC-E2E-00005',
  addItemInvoiceId: '60000000-0000-0000-0000-000000000095',
  cancellableInvoice: 'FAC-E2E-00006',
  cancellableInvoiceId: '60000000-0000-0000-0000-000000000094',
  medicalRecordId: '20000000-0000-0000-0000-000000000099',
  completedAppointmentId: '10000000-0000-0000-0000-000000000096',
  inProgressAppointmentId: '10000000-0000-0000-0000-000000000097',
  confirmedAppointmentId: '10000000-0000-0000-0000-000000000098',
  scheduledAppointmentId: '10000000-0000-0000-0000-000000000099',
  noNotesAppointmentId: '10000000-0000-0000-0000-000000000095',
} as const

export async function loginAs(
  page: Page,
  username = ADMIN_USER,
  password = ADMIN_PASS,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/(dashboard)?$/)
}

export const loginAsAdmin = (page: Page) => loginAs(page, ADMIN_USER, ADMIN_PASS)
export const loginAsDoctor = (page: Page) => loginAs(page, DOCTOR_USER, DOCTOR_PASS)
export const loginAsReceptionist = (page: Page) =>
  loginAs(page, RECEPTIONIST_USER, RECEPTIONIST_PASS)

export async function openFromNav(page: Page, name: string, url: RegExp | string): Promise<void> {
  await page.getByRole('link', { name, exact: true }).first().click()
  await expect(page).toHaveURL(url)
}

export async function openPatients(page: Page): Promise<void> {
  await openFromNav(page, 'Pacientes', '/patients')
}

export async function openInvoices(page: Page): Promise<void> {
  await openFromNav(page, 'Facturas', '/invoices')
}

export async function openAppointments(page: Page): Promise<void> {
  await openFromNav(page, 'Citas', /\/appointments/)
}

export async function openE2EPatient(page: Page, lastName = 'Cobertura'): Promise<void> {
  await openPatients(page)
  await page.getByPlaceholder('Filtrar por apellido...').fill(lastName)
  const row = page.getByRole('row').filter({ hasText: E2E.patientName })
  await expect(row).toBeVisible()
  await row.getByRole('link', { name: 'Ver detalle del paciente' }).click()
  await expect(page).toHaveURL(/\/patients\//)
}

export async function openInvoiceByNumber(page: Page, invoiceNumber: string): Promise<void> {
  await openInvoices(page)
  const row = page.getByRole('row').filter({ hasText: invoiceNumber })
  await expect(row).toBeVisible()
  await row.getByRole('link', { name: 'Ver detalle de la factura' }).click()
  await expect(page).toHaveURL(/\/invoices\//)
  await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible()
}

export async function openInvoiceById(page: Page, id: string): Promise<void> {
  await page.goto(`/invoices/${id}`)
  await expect(page.getByText('Resumen financiero')).toBeVisible()
}

export async function openAppointmentById(page: Page, id: string): Promise<void> {
  await page.goto(`/appointments/${id}`)
  await expect(page.getByRole('heading', { name: 'Detalle de cita' })).toBeVisible()
}
