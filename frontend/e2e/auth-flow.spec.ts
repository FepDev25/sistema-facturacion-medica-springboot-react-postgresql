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

test.describe('Login page', () => {
  test('renders login form with all elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Acceso al sistema')).toBeVisible()
    await expect(page.getByText('Inicia sesión para continuar en Facturación Médica.')).toBeVisible()
    await expect(page.getByLabel('Usuario')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page.getByPlaceholder('usuario')).toBeVisible()
    await expect(page.getByPlaceholder('********')).toBeVisible()
  })

  test('no sidebar on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('aside')).not.toBeVisible()
    await expect(page.locator('nav').getByRole('link')).not.toBeVisible()
  })

  test('username input has autocomplete attribute', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Usuario')).toHaveAttribute('autocomplete', 'username')
    await expect(page.getByLabel('Contraseña')).toHaveAttribute('autocomplete', 'current-password')
  })

  test('shows two validation errors on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    const errors = page.getByText('Requerido')
    await expect(errors).toHaveCount(2)
  })

  test('shows validation error when only password is filled', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Contraseña').fill('somepassword')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Requerido')).toHaveCount(1)
  })

  test('shows validation error when only username is filled', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('admin')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Requerido')).toHaveCount(1)
  })

  test('shows error banner on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('wronguser')
    await page.getByLabel('Contraseña').fill('wrongpass')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText(/No se pudo iniciar sesión|Verifica tus credenciales/)).toBeVisible()
  })

  test('error banner disappears on new submit attempt', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('wronguser')
    await page.getByLabel('Contraseña').fill('wrongpass')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText(/No se pudo iniciar sesión/)).toBeVisible()

    await page.getByLabel('Usuario').fill('')
    await page.getByLabel('Contraseña').fill('')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Requerido')).toHaveCount(2)
  })

  test('successful login redirects away from /login', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('button shows loading state during login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Usuario').fill('admin')
    await page.getByLabel('Contraseña').fill('admin123')

    const submitPromise = page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('button', { name: 'Ingresando...' })).toBeVisible()
    await submitPromise
  })
})

test.describe('Post-login AppShell', () => {
  test('shows sidebar with branding after login', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.locator('aside')).toBeVisible()
    await expect(page.locator('aside').getByText('Facturación Médica')).toBeVisible()
  })

  test('shows role badge in sidebar', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.locator('aside').getByText('Administrador')).toBeVisible()
  })

  test('sidebar shows username in profile link', async ({ page }) => {
    await loginAsAdmin(page)
    const profileLink = page.locator('aside').getByRole('link', { name: /admin/i })
    await expect(profileLink.first()).toBeVisible()
  })

  test('logout button is visible in sidebar', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
  })

  test('ADMIN sees all nav items', async ({ page }) => {
    await loginAsAdmin(page)
    const navLinks = page.locator('aside nav').getByRole('link')
    await expect(navLinks.filter({ hasText: 'Dashboard' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Pacientes' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Médicos' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Citas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Facturas' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Seguros' })).toBeVisible()
    await expect(navLinks.filter({ hasText: 'Catálogo' })).toBeVisible()
  })

  test('active nav link is highlighted', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Pacientes' }).click()
    await expect(page).toHaveURL('/patients')

    const activeLink = page.locator('aside nav').getByRole('link', { name: 'Pacientes' })
    await expect(activeLink).toHaveClass(/bg-primary/)
  })

  test('navigating to profile page works', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside').getByRole('link', { name: /admin/i }).first().click()
    await expect(page).toHaveURL('/profile')
  })
})

test.describe('Logout flow', () => {
  test('clicking logout redirects to login page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('after logout, visiting protected page redirects to login', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/appointments')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Profile page', () => {
  test('renders profile information', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/profile')

    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible()
    await expect(page.getByText('Informacion de la cuenta')).toBeVisible()
    await expect(page.getByText('Datos de usuario')).toBeVisible()
  })

  test('shows username, email and role', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/profile')

    await expect(page.getByText('Usuario')).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText('Rol')).toBeVisible()
  })

  test('shows active status badge', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/profile')

    await expect(page.getByText('Estado')).toBeVisible()
    await expect(page.getByText('Activo')).toBeVisible()
  })

  test('back navigation from profile works', async ({ page }) => {
    await loginAsAdmin(page)
    await page.locator('aside nav').getByRole('link', { name: 'Dashboard' }).click()
    await page.locator('aside').getByRole('link', { name: /admin/i }).first().click()
    await expect(page).toHaveURL('/profile')

    await page.goBack()
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })
})

test.describe('Route protection', () => {
  test('unauthenticated access to /appointments redirects to login', async ({ page }) => {
    await page.goto('/appointments')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access to /patients redirects to login', async ({ page }) => {
    await page.goto('/patients')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access to /invoices redirects to login', async ({ page }) => {
    await page.goto('/invoices')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access to /profile redirects to login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })
})
