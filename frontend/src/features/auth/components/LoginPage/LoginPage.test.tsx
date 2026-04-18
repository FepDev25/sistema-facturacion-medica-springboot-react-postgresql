import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '@/features/auth/components/LoginPage'

const { mockNavigate, mockMutateAsync, mockUseLogin } = vi.hoisted(() => {
  const mockNavigate = vi.fn()
  const mockMutateAsync = vi.fn()
  const mockUseLogin = vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }))
  return { mockNavigate, mockMutateAsync, mockUseLogin }
})

let mockSearch = { redirect: undefined }

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useLogin: mockUseLogin,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset()
    mockNavigate.mockReset()
    mockUseLogin.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })
    mockSearch = { redirect: undefined }
  })
  afterEach(cleanup)

  describe('rendering', () => {
    it('renders the login form with title and fields', () => {
      render(<LoginPage />)
      expect(screen.getByText('Acceso al sistema')).toBeInTheDocument()
      expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    })

    it('renders submit button text', () => {
      render(<LoginPage />)
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    })

    it('shows loading state when mutation is pending', () => {
      mockUseLogin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      })
      render(<LoginPage />)
      expect(mockUseLogin).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Ingresando...' })).toBeDisabled()
    })
  })

  describe('validation', () => {
    it('shows validation errors on empty submit', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))
      expect(await screen.findAllByText('Requerido')).toHaveLength(2)
    })

    it('shows validation error for empty username only', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      await user.type(screen.getByLabelText('Contraseña'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))
      expect(screen.getByText('Requerido')).toBeInTheDocument()
    })

    it('shows validation error for empty password only', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      await user.type(screen.getByLabelText('Usuario'), 'admin')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))
      expect(screen.getByText('Requerido')).toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('calls mutateAsync with form values and navigates to /', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValueOnce({})
      render(<LoginPage />)

      await user.type(screen.getByLabelText('Usuario'), 'admin')
      await user.type(screen.getByLabelText('Contraseña'), 'secret')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ username: 'admin', password: 'secret' })
      })
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
    })

    it('navigates to redirect URL when provided', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValueOnce({})
      mockSearch = { redirect: '/appointments' }
      render(<LoginPage />)

      await user.type(screen.getByLabelText('Usuario'), 'admin')
      await user.type(screen.getByLabelText('Contraseña'), 'secret')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/appointments' })
      })
    })

    it('ignores malformed redirect URL and navigates to /', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValueOnce({})
      mockSearch = { redirect: 'http://evil.com' }
      render(<LoginPage />)

      await user.type(screen.getByLabelText('Usuario'), 'admin')
      await user.type(screen.getByLabelText('Contraseña'), 'secret')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
    })

    it('shows error message when login fails', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockRejectedValueOnce(new Error('Unauthorized'))
      render(<LoginPage />)

      await user.type(screen.getByLabelText('Usuario'), 'admin')
      await user.type(screen.getByLabelText('Contraseña'), 'wrong')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))

      expect(
        await screen.findByText('No se pudo iniciar sesión. Verifica tus credenciales.'),
      ).toBeInTheDocument()
    })

    it('clears previous error on new submit attempt', async () => {
      const user = userEvent.setup()
      mockMutateAsync
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({})

      render(<LoginPage />)

      await user.type(screen.getByLabelText('Usuario'), 'admin')
      await user.type(screen.getByLabelText('Contraseña'), 'pass1')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))

      expect(
        await screen.findByText('No se pudo iniciar sesión. Verifica tus credenciales.'),
      ).toBeInTheDocument()

      await user.clear(screen.getByLabelText('Contraseña'))
      await user.type(screen.getByLabelText('Contraseña'), 'pass2')
      await user.click(screen.getByRole('button', { name: 'Ingresar' }))

      await waitFor(() => {
        expect(
          screen.queryByText('No se pudo iniciar sesión. Verifica tus credenciales.'),
        ).not.toBeInTheDocument()
      })
    })
  })
})
