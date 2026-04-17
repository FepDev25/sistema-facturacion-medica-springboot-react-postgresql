import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AllergyAlert } from '@/components/AllergyAlert'

describe('AllergyAlert', () => {
  describe('null guard - renders nothing', () => {
    it('returns null when allergies is undefined', () => {
      const { container } = render(<AllergyAlert />)
      expect(container.innerHTML).toBe('')
    })

    it('returns null when allergies is null', () => {
      const { container } = render(<AllergyAlert allergies={null} />)
      expect(container.innerHTML).toBe('')
    })

    it('returns null when allergies is empty string', () => {
      const { container } = render(<AllergyAlert allergies="" />)
      expect(container.innerHTML).toBe('')
    })

    it('returns null when allergies is whitespace only', () => {
      const { container } = render(<AllergyAlert allergies="   " />)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('full mode (default)', () => {
    it('renders the allergy text', () => {
      render(<AllergyAlert allergies="Penicilina, Aspirina" />)
      expect(screen.getByText('Penicilina, Aspirina')).toBeInTheDocument()
    })

    it('shows patient name in description when provided', () => {
      render(<AllergyAlert allergies="Polen" patientName="Juan Perez" />)
      expect(screen.getByText(/Juan Perez presenta alergias registradas/)).toBeInTheDocument()
    })

    it('shows generic message when patientName is not provided', () => {
      render(<AllergyAlert allergies="Polen" />)
      expect(screen.getByText(/Paciente con alergias registradas/)).toBeInTheDocument()
    })

    it('includes verification warning text', () => {
      render(<AllergyAlert allergies="Latex" />)
      expect(screen.getByText(/Verifica antes de prescribir o administrar medicación/)).toBeInTheDocument()
    })

    it('renders ShieldAlert icon in full mode', () => {
      const { container } = render(<AllergyAlert allergies="Polvo" />)
      expect(container.querySelector('svg.lucide-shield-alert')).toBeInTheDocument()
    })

    it('applies gradient background in full mode', () => {
      const { container } = render(<AllergyAlert allergies="Polvo" />)
      const section = container.querySelector('section')
      expect(section?.className).toContain('bg-gradient-to-r')
    })

    it('trims whitespace from allergy text', () => {
      render(<AllergyAlert allergies="  Penicilina  " />)
      expect(screen.getByText('Penicilina')).toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('renders the allergy text in compact layout', () => {
      render(<AllergyAlert allergies="Ibuprofeno" compact />)
      expect(screen.getByText('Ibuprofeno')).toBeInTheDocument()
    })

    it('shows "Alergia registrada" title', () => {
      render(<AllergyAlert allergies="Polen" compact />)
      expect(screen.getByText('Alergia registrada')).toBeInTheDocument()
    })

    it('renders AlertTriangle icon in compact mode', () => {
      const { container } = render(<AllergyAlert allergies="Polvo" compact />)
      expect(container.querySelector('svg.lucide-triangle-alert')).toBeInTheDocument()
    })

    it('does NOT render ShieldAlert icon in compact mode', () => {
      const { container } = render(<AllergyAlert allergies="Polvo" compact />)
      expect(container.querySelector('svg.lucide-shield-alert')).not.toBeInTheDocument()
    })

    it('uses a div instead of section in compact mode', () => {
      const { container } = render(<AllergyAlert allergies="Polvo" compact />)
      expect(container.querySelector('section')).toBeNull()
      expect(container.querySelector('div.rounded-md')).toBeInTheDocument()
    })

    it('does NOT show patient name in compact mode', () => {
      render(<AllergyAlert allergies="Polen" patientName="Juan" compact />)
      expect(screen.queryByText(/Juan presenta alergias/)).not.toBeInTheDocument()
    })
  })
})
