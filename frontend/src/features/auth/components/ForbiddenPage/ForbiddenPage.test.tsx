import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({ from: '/doctors' }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

import { ForbiddenPage } from '@/features/auth/components/ForbiddenPage'

afterEach(cleanup)

describe('ForbiddenPage', () => {
  it('explica el bloqueo y muestra la ruta intentada', () => {
    render(<ForbiddenPage />)

    expect(screen.getByRole('heading', { name: 'No tienes permisos' })).toBeInTheDocument()
    expect(screen.getByText('/doctors')).toBeInTheDocument()
  })

  it('ofrece volver al dashboard', () => {
    render(<ForbiddenPage />)

    expect(screen.getByRole('link', { name: /Volver al dashboard/ })).toHaveAttribute('href', '/')
  })
})
