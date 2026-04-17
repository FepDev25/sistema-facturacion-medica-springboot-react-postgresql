import { describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatusFlow } from '@/features/appointments/components/AppointmentStatusFlow'
import type { AppointmentStatus } from '@/types/enums'

const makeCallbacks = () => ({
  canOperate: true,
  canComplete: true,
  onConfirm: vi.fn(),
  onStart: vi.fn(),
  onComplete: vi.fn(),
  onNoShow: vi.fn(),
  onCancel: vi.fn(),
})

describe('AppointmentStatusFlow', () => {
  afterEach(cleanup)
  describe('status badge rendering', () => {
    it('renders all 6 status labels', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByText('Programada')).toBeInTheDocument()
      expect(screen.getByText('Confirmada')).toBeInTheDocument()
      expect(screen.getByText('En curso')).toBeInTheDocument()
      expect(screen.getByText('Completada')).toBeInTheDocument()
      expect(screen.getByText('Cancelada')).toBeInTheDocument()
      expect(screen.getByText('No se presentó')).toBeInTheDocument()
    })

    it('highlights the current status badge with aria-current="step"', () => {
      const { rerender } = render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByText('Programada')).toHaveAttribute('aria-current', 'step')
      expect(screen.getByText('Confirmada')).not.toHaveAttribute('aria-current')

      rerender(<AppointmentStatusFlow status="in_progress" {...makeCallbacks()} />)
      expect(screen.getByText('En curso')).toHaveAttribute('aria-current', 'step')
      expect(screen.getByText('Programada')).not.toHaveAttribute('aria-current')
    })

    it('renders arrow separators between statuses', () => {
      const { container } = render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      const arrows = container.querySelectorAll('svg.lucide-arrow-right')
      expect(arrows).toHaveLength(5)
    })
  })

  describe('transition recommendation text', () => {
    it('shows "Confirmar" recommendation when scheduled', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByText(/Siguiente recomendado: Confirmar/)).toBeInTheDocument()
    })

    it('shows "Iniciar" recommendation when confirmed', () => {
      render(<AppointmentStatusFlow status="confirmed" {...makeCallbacks()} />)
      expect(screen.getByText(/Siguiente recomendado: Iniciar/)).toBeInTheDocument()
    })

    it('shows "Completar" recommendation when in_progress', () => {
      render(<AppointmentStatusFlow status="in_progress" {...makeCallbacks()} />)
      expect(screen.getByText(/Siguiente recomendado: Completar/)).toBeInTheDocument()
    })

    it('shows final state label when completed', () => {
      render(<AppointmentStatusFlow status="completed" {...makeCallbacks()} />)
      expect(screen.getByText(/Estado final: Completada/)).toBeInTheDocument()
    })

    it('shows final state label when cancelled', () => {
      render(<AppointmentStatusFlow status="cancelled" {...makeCallbacks()} />)
      expect(screen.getByText(/Estado final: Cancelada/)).toBeInTheDocument()
    })

    it('shows final state label when no_show', () => {
      render(<AppointmentStatusFlow status="no_show" {...makeCallbacks()} />)
      expect(screen.getByText(/Estado final: No show/)).toBeInTheDocument()
    })
  })

  describe('button enable/disable logic', () => {
    it('enables Confirmar when scheduled + canOperate', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled()
    })

    it('disables Confirmar when status is not scheduled', () => {
      render(<AppointmentStatusFlow status="confirmed" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    })

    it('disables Confirmar when canOperate is false', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} canOperate={false} />)
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    })

    it('enables Iniciar when confirmed + canOperate', () => {
      render(<AppointmentStatusFlow status="confirmed" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Iniciar' })).not.toBeDisabled()
    })

    it('disables Iniciar when status is not confirmed', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Iniciar' })).toBeDisabled()
    })

    it('enables Completar when in_progress + canComplete', () => {
      render(<AppointmentStatusFlow status="in_progress" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Completar' })).not.toBeDisabled()
    })

    it('disables Completar when canComplete is false', () => {
      render(<AppointmentStatusFlow status="in_progress" {...makeCallbacks()} canComplete={false} />)
      expect(screen.getByRole('button', { name: 'Completar' })).toBeDisabled()
    })

    it('disables Completar when status is not in_progress', () => {
      render(<AppointmentStatusFlow status="confirmed" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Completar' })).toBeDisabled()
    })

    it('enables No show when scheduled + canOperate', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'No show' })).not.toBeDisabled()
    })

    it('enables No show when confirmed + canOperate', () => {
      render(<AppointmentStatusFlow status="confirmed" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'No show' })).not.toBeDisabled()
    })

    it('disables No show when in_progress', () => {
      render(<AppointmentStatusFlow status="in_progress" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'No show' })).toBeDisabled()
    })

    it('disables No show when canOperate is false', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} canOperate={false} />)
      expect(screen.getByRole('button', { name: 'No show' })).toBeDisabled()
    })

    it('enables Cancelar when scheduled + canOperate', () => {
      render(<AppointmentStatusFlow status="scheduled" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Cancelar' })).not.toBeDisabled()
    })

    it('enables Cancelar when confirmed + canOperate', () => {
      render(<AppointmentStatusFlow status="confirmed" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Cancelar' })).not.toBeDisabled()
    })

    it('disables Cancelar when in_progress', () => {
      render(<AppointmentStatusFlow status="in_progress" {...makeCallbacks()} />)
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    })
  })

  describe('callback firing', () => {
    it('calls onConfirm when Confirmar is clicked', async () => {
      const user = userEvent.setup()
      const callbacks = makeCallbacks()
      render(<AppointmentStatusFlow status="scheduled" {...callbacks} />)
      await user.click(screen.getByRole('button', { name: 'Confirmar' }))
      expect(callbacks.onConfirm).toHaveBeenCalledOnce()
    })

    it('calls onStart when Iniciar is clicked', async () => {
      const user = userEvent.setup()
      const callbacks = makeCallbacks()
      render(<AppointmentStatusFlow status="confirmed" {...callbacks} />)
      await user.click(screen.getByRole('button', { name: 'Iniciar' }))
      expect(callbacks.onStart).toHaveBeenCalledOnce()
    })

    it('calls onComplete when Completar is clicked', async () => {
      const user = userEvent.setup()
      const callbacks = makeCallbacks()
      render(<AppointmentStatusFlow status="in_progress" {...callbacks} />)
      await user.click(screen.getByRole('button', { name: 'Completar' }))
      expect(callbacks.onComplete).toHaveBeenCalledOnce()
    })

    it('calls onNoShow when No show is clicked', async () => {
      const user = userEvent.setup()
      const callbacks = makeCallbacks()
      render(<AppointmentStatusFlow status="scheduled" {...callbacks} />)
      await user.click(screen.getByRole('button', { name: 'No show' }))
      expect(callbacks.onNoShow).toHaveBeenCalledOnce()
    })

    it('calls onCancel when Cancelar is clicked', async () => {
      const user = userEvent.setup()
      const callbacks = makeCallbacks()
      render(<AppointmentStatusFlow status="scheduled" {...callbacks} />)
      await user.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(callbacks.onCancel).toHaveBeenCalledOnce()
    })

    it('does not fire callbacks when buttons are disabled (completed status)', async () => {
      const user = userEvent.setup()
      const callbacks = makeCallbacks()
      render(<AppointmentStatusFlow status="completed" {...callbacks} />)
      const buttons = screen.getAllByRole('button')
      for (const button of buttons) {
        await user.click(button)
      }
      expect(callbacks.onConfirm).not.toHaveBeenCalled()
      expect(callbacks.onStart).not.toHaveBeenCalled()
      expect(callbacks.onComplete).not.toHaveBeenCalled()
      expect(callbacks.onNoShow).not.toHaveBeenCalled()
      expect(callbacks.onCancel).not.toHaveBeenCalled()
    })
  })
})
