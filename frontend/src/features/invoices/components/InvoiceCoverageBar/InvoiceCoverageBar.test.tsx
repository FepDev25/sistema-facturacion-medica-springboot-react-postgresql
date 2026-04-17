import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvoiceCoverageBar } from '@/features/invoices/components/InvoiceCoverageBar'

describe('InvoiceCoverageBar', () => {
  describe('progress bar segments', () => {
    it('renders insurance (cyan) and patient (slate) segments with correct widths', () => {
      const { container } = render(
        <InvoiceCoverageBar total={1000} insuranceCoverage={800} patientResponsibility={200} />,
      )

      const segments = container.querySelectorAll('[style*="width"]')
      expect(segments).toHaveLength(2)
      expect(segments[0].getAttribute('style')).toContain('width: 80%')
      expect(segments[1].getAttribute('style')).toContain('width: 20%')
    })

    it('renders full insurance coverage at 100%', () => {
      const { container } = render(
        <InvoiceCoverageBar total={500} insuranceCoverage={500} patientResponsibility={0} />,
      )

      const segments = container.querySelectorAll('[style*="width"]')
      expect(segments[0].getAttribute('style')).toContain('width: 100%')
      expect(segments[1].getAttribute('style')).toContain('width: 0%')
    })

    it('renders full patient responsibility at 100%', () => {
      const { container } = render(
        <InvoiceCoverageBar total={300} insuranceCoverage={0} patientResponsibility={300} />,
      )

      const segments = container.querySelectorAll('[style*="width"]')
      expect(segments[0].getAttribute('style')).toContain('width: 0%')
      expect(segments[1].getAttribute('style')).toContain('width: 100%')
    })

    it('clamps individual percentages to 0-100 range', () => {
      const { container } = render(
        <InvoiceCoverageBar total={100} insuranceCoverage={120} patientResponsibility={120} />,
      )

      const segments = container.querySelectorAll('[style*="width"]')
      expect(segments[0].getAttribute('style')).toContain('width: 100%')
      expect(segments[1].getAttribute('style')).toContain('width: 100%')
    })

    it('sets both segments to 0% when total is 0', () => {
      const { container } = render(
        <InvoiceCoverageBar total={0} insuranceCoverage={0} patientResponsibility={0} />,
      )

      const segments = container.querySelectorAll('[style*="width"]')
      expect(segments[0].getAttribute('style')).toContain('width: 0%')
      expect(segments[1].getAttribute('style')).toContain('width: 0%')
    })
  })

  describe('total display', () => {
    it('shows the total formatted as currency in the header', () => {
      render(<InvoiceCoverageBar total={1250.5} insuranceCoverage={1000} patientResponsibility={250.5} />)
      expect(screen.getByText(/Total/).textContent).toContain('$1,250.50')
    })

    it('falls back to insuranceCoverage + patientResponsibility when total is 0', () => {
      render(<InvoiceCoverageBar total={0} insuranceCoverage={600} patientResponsibility={400} />)
      expect(screen.getByText(/Total/).textContent).toContain('$1,000.00')
    })
  })

  describe('summary cards', () => {
    it('shows insurance percentage and amount in cyan card', () => {
      render(<InvoiceCoverageBar total={1000} insuranceCoverage={800} patientResponsibility={200} />)

      expect(screen.getByText(/Seguro \(80\.0%\)/)).toBeInTheDocument()
      expect(screen.getByText('$800.00')).toBeInTheDocument()
    })

    it('shows patient percentage and amount in slate card', () => {
      render(<InvoiceCoverageBar total={1000} insuranceCoverage={800} patientResponsibility={200} />)

      expect(screen.getByText(/Paciente \(20\.0%\)/)).toBeInTheDocument()
    })

    it('shows correct decimal precision for odd percentages', () => {
      render(<InvoiceCoverageBar total={3} insuranceCoverage={1} patientResponsibility={2} />)

      expect(screen.getByText(/Seguro \(33\.3%\)/)).toBeInTheDocument()
      expect(screen.getByText(/Paciente \(66\.7%\)/)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state message when normalizedTotal is 0', () => {
      render(<InvoiceCoverageBar total={0} insuranceCoverage={0} patientResponsibility={0} />)
      expect(screen.getByText('Aun no hay montos para calcular cobertura.')).toBeInTheDocument()
    })

    it('hides empty state message when there are amounts', () => {
      render(<InvoiceCoverageBar total={100} insuranceCoverage={80} patientResponsibility={20} />)
      expect(screen.queryByText('Aun no hay montos para calcular cobertura.')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has aria-label on insurance segment', () => {
      render(
        <InvoiceCoverageBar total={1000} insuranceCoverage={800} patientResponsibility={200} />,
      )
      expect(screen.getByLabelText('Cobertura del seguro')).toBeInTheDocument()
    })

    it('has aria-label on patient segment', () => {
      render(
        <InvoiceCoverageBar total={1000} insuranceCoverage={800} patientResponsibility={200} />,
      )
      expect(screen.getByLabelText('Responsabilidad del paciente')).toBeInTheDocument()
    })
  })
})
