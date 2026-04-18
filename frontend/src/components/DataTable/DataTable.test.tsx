import { describe, expect, it } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/components/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

interface TestRow {
  id: number
  name: string
  email: string
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'email', header: 'Email' },
]

const sampleData: TestRow[] = [
  { id: 1, name: 'Ana García', email: 'ana@test.com' },
  { id: 2, name: 'Luis Pérez', email: 'luis@test.com' },
  { id: 3, name: 'María López', email: 'maria@test.com' },
]

describe('DataTable', () => {
  afterEach(cleanup)

  describe('rendering', () => {
    it('renders column headers', () => {
      render(<DataTable columns={columns} data={sampleData} />)
      expect(screen.getByText('Nombre')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('renders data rows', () => {
      render(<DataTable columns={columns} data={sampleData} />)
      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.getByText('Luis Pérez')).toBeInTheDocument()
      expect(screen.getByText('María López')).toBeInTheDocument()
    })

    it('renders empty message when data is empty', () => {
      render(<DataTable columns={columns} data={[]} />)
      expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
    })

    it('renders custom empty message', () => {
      render(<DataTable columns={columns} data={[]} emptyMessage="No hay datos" />)
      expect(screen.getByText('No hay datos')).toBeInTheDocument()
    })

    it('sets aria-busy when loading', () => {
      const { container } = render(<DataTable columns={columns} data={[]} isLoading />)
      const wrapper = container.querySelector('[aria-busy]')
      expect(wrapper).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('loading state', () => {
    it('renders skeleton rows when loading', () => {
      const { container } = render(
        <DataTable columns={columns} data={[]} isLoading pageSize={5} />,
      )
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
      expect(skeletons.length).toBe(5 * 2)
    })

    it('does not show pagination when loading', () => {
      render(<DataTable columns={columns} data={[]} isLoading pageSize={1} />)
      expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Página siguiente')).not.toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('does not show pagination controls when data fits in one page', () => {
      render(<DataTable columns={columns} data={sampleData} pageSize={20} />)
      expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Página siguiente')).not.toBeInTheDocument()
    })

    it('shows pagination controls when data exceeds one page', () => {
      render(<DataTable columns={columns} data={sampleData} pageSize={2} />)
      expect(screen.getByText(/Mostrando 1–2 de 3/)).toBeInTheDocument()
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    })

    it('navigates to next page on clicking next button', async () => {
      const user = userEvent.setup()
      render(<DataTable columns={columns} data={sampleData} pageSize={2} />)
      await user.click(screen.getByLabelText('Página siguiente'))
      expect(screen.getByText(/Mostrando 3–3 de 3/)).toBeInTheDocument()
      expect(screen.getByText('2 / 2')).toBeInTheDocument()
    })

    it('navigates to previous page on clicking previous button', async () => {
      const user = userEvent.setup()
      render(<DataTable columns={columns} data={sampleData} pageSize={2} />)
      await user.click(screen.getByLabelText('Página siguiente'))
      await user.click(screen.getByLabelText('Página anterior'))
      expect(screen.getByText(/Mostrando 1–2 de 3/)).toBeInTheDocument()
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    })

    it('disables previous button on first page', () => {
      render(<DataTable columns={columns} data={sampleData} pageSize={2} />)
      expect(screen.getByLabelText('Página anterior')).toBeDisabled()
    })

    it('disables next button on last page', async () => {
      const user = userEvent.setup()
      render(<DataTable columns={columns} data={sampleData} pageSize={2} />)
      await user.click(screen.getByLabelText('Página siguiente'))
      expect(screen.getByLabelText('Página siguiente')).toBeDisabled()
    })

    it('shows "Sin resultados" in pagination when filtered to 0 rows', () => {
      const data: TestRow[] = []
      render(<DataTable columns={columns} data={data} pageSize={2} />)
      expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('renders as a table with proper semantics', () => {
      render(<DataTable columns={columns} data={sampleData} />)
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(2)
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
    })

    it('renders previous/next buttons with aria-labels', () => {
      render(<DataTable columns={columns} data={sampleData} pageSize={2} />)
      expect(screen.getByLabelText('Página anterior')).toBeInTheDocument()
      expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument()
    })
  })
})
