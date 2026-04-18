import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { BackToListButton } from '@/components/BackToListButton'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

describe('BackToListButton', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })
  afterEach(cleanup)

  it('renders with the given label', () => {
    render(<BackToListButton fallbackTo="/patients" label="Volver a pacientes" />)
    expect(screen.getByRole('button', { name: 'Volver a pacientes' })).toBeInTheDocument()
  })

  it('calls window.history.back when history has entries', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    Object.defineProperty(window.history, 'length', { value: 3, writable: true })

    render(<BackToListButton fallbackTo="/patients" label="Volver" />)
    const user = await import('@testing-library/user-event')
    await user.setup().click(screen.getByRole('button', { name: 'Volver' }))

    expect(backSpy).toHaveBeenCalledOnce()
    expect(mockNavigate).not.toHaveBeenCalled()
    backSpy.mockRestore()
  })

  it('navigates to fallback when history is empty', async () => {
    Object.defineProperty(window.history, 'length', { value: 1, writable: true })
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    render(<BackToListButton fallbackTo="/doctors" label="Volver" />)
    const user = await import('@testing-library/user-event')
    await user.setup().click(screen.getByRole('button', { name: 'Volver' }))

    expect(backSpy).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/doctors' })
    backSpy.mockRestore()
  })
})
