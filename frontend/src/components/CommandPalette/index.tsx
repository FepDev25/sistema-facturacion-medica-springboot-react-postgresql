import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Search, UserRound } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useRolePermissions } from '@/features/auth/hooks/useRolePermissions'
import { useSearchPatients } from '@/features/patients/hooks/usePatients'
import { ALL_NAV_ITEMS } from '@/components/AppShell/navItems'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PaletteItem {
  key: string
  label: string
  hint: string
  icon: typeof Search
  onSelect: () => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { role, canManagePatients } = useRolePermissions()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const { data: patients = [], isFetching } = useSearchPatients(canManagePatients ? query : '')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpenChange])

  const go = useCallback(
    (to: string) => {
      onOpenChange(false)
      void navigate({ to: to as never })
    },
    [navigate, onOpenChange],
  )

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery('')
      setActiveIndex(0)
    }
    onOpenChange(next)
  }

  const items = useMemo<PaletteItem[]>(() => {
    const normalized = query.trim().toLowerCase()

    const navigation = (role ? ALL_NAV_ITEMS.filter((item) => item.roles.includes(role)) : [])
      .filter((item) => !normalized || item.label.toLowerCase().includes(normalized))
      .map((item) => ({
        key: `nav:${item.to}`,
        label: item.label,
        hint: 'Ir a',
        icon: item.icon,
        onSelect: () => go(item.to),
      }))

    const patientItems =
      canManagePatients && normalized.length > 1
        ? patients.slice(0, 5).map((patient) => ({
            key: `patient:${patient.id}`,
            label: `${patient.firstName} ${patient.lastName}`,
            hint: patient.dni,
            icon: UserRound,
            onSelect: () => go(`/patients/${patient.id}`),
          }))
        : []

    return [...navigation, ...patientItems]
  }, [canManagePatients, go, patients, query, role])

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(items.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      items[activeIndex]?.onSelect()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
        <DialogDescription className="sr-only">
          Busca secciones del sistema o pacientes por nombre o DNI.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Buscar pacientes o secciones…"
            aria-label="Buscar pacientes o secciones"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query.trim().length > 1 && canManagePatients
                ? 'Sin resultados para esa búsqueda.'
                : 'Escribe al menos dos letras para buscar pacientes.'}
            </p>
          ) : (
            <ul role="listbox" aria-label="Resultados">
              {items.map((item, index) => {
                const Icon = item.icon
                return (
                  <li key={item.key} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      onClick={item.onSelect}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        index === activeIndex
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.hint}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
