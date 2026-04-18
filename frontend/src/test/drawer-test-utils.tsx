import type { ReactNode } from 'react'

function Passthrough({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

export function MockSheet({ open, children }: { open: boolean; children?: ReactNode }) {
  if (!open) return null
  return <div data-testid="sheet">{children}</div>
}

export function MockSheetContent({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={className} data-slot="sheet-content">{children}</div>
}

export function MockSheetHeader({ children }: { children?: ReactNode }) {
  return <div data-slot="sheet-header">{children}</div>
}

export function MockSheetTitle({ children }: { children?: ReactNode }) {
  return <h2 data-slot="sheet-title">{children}</h2>
}

export function MockSheetFooter({ children }: { children?: ReactNode }) {
  return <div data-slot="sheet-footer">{children}</div>
}

export function MockSelect({ children, onValueChange, value }: {
  children?: ReactNode
  onValueChange?: (value: string) => void
  value?: string
}) {
  return (
    <div data-testid="select" data-value={value}>
      {children}
      <input
        type="hidden"
        value={value ?? ''}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  )
}

export function MockSelectTrigger({ children }: { children?: ReactNode }) {
  return <div data-slot="select-trigger">{children}</div>
}

export function MockSelectContent({ children }: { children?: ReactNode }) {
  return <div data-slot="select-content">{children}</div>
}

export function MockSelectItem({ children, value }: { children?: ReactNode; value: string }) {
  return (
    <button
      type="button"
      data-slot="select-item"
      data-value={value}
      onClick={() => {
        const select = document.querySelector('[data-testid="select"]')
        if (select) {
          const hidden = select.querySelector('input[type="hidden"]')
          if (hidden) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            nativeInputValueSetter?.call(hidden, value)
            hidden.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
      }}
    >
      {children}
    </button>
  )
}

export function MockSelectValue({ placeholder }: { placeholder?: string }) {
  return <span data-slot="select-value">{placeholder}</span>
}

export function MockCheckbox({ checked, onCheckedChange }: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ?? false}
      data-testid="checkbox"
      onClick={() => onCheckedChange?.(!checked)}
    />
  )
}

const sheetMocks = {
  Sheet: MockSheet,
  SheetContent: MockSheetContent,
  SheetHeader: MockSheetHeader,
  SheetTitle: MockSheetTitle,
  SheetFooter: MockSheetFooter,
}

const selectMocks = {
  Select: MockSelect,
  SelectTrigger: MockSelectTrigger,
  SelectContent: MockSelectContent,
  SelectItem: MockSelectItem,
  SelectValue: MockSelectValue,
}

export { Passthrough, sheetMocks, selectMocks }
