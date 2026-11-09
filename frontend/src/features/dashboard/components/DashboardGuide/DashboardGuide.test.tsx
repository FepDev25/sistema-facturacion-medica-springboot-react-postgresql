import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardGuide } from '@/features/dashboard/components/DashboardGuide'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

describe('DashboardGuide', () => {
  it('muestra las tarjetas de la guía por defecto', () => {
    render(<DashboardGuide role="ADMIN" />)

    expect(screen.getByText('Guía rápida · Administrador')).toBeInTheDocument()
    expect(screen.getByText('Configuración maestra')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ocultar guía/ })).toBeInTheDocument()
  })

  it('colapsa la guía y recuerda la preferencia', async () => {
    const user = userEvent.setup()
    render(<DashboardGuide role="ADMIN" />)

    await user.click(screen.getByRole('button', { name: /Ocultar guía/ }))

    expect(screen.queryByText('Configuración maestra')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mostrar guía/ })).toBeInTheDocument()
    expect(window.localStorage.getItem('sfm.dashboard.guide.collapsed')).toBe('true')
  })

  it('arranca colapsada si la preferencia está guardada', () => {
    window.localStorage.setItem('sfm.dashboard.guide.collapsed', 'true')

    render(<DashboardGuide role="DOCTOR" />)

    expect(screen.queryByText('Tu agenda')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mostrar guía/ })).toBeInTheDocument()
  })

  it('no renderiza nada sin rol', () => {
    const { container } = render(<DashboardGuide role={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
