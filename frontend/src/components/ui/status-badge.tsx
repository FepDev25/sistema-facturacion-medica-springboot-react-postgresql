import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusTone = 'success' | 'warning' | 'info' | 'progress' | 'active' | 'neutral'

/** Single source of truth for status pill colors across the whole app. */
const TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  info: 'border-info/25 bg-info/10 text-info',
  progress: 'border-info/25 bg-info/10 text-info',
  active: 'border-primary/25 bg-primary/10 text-primary',
  neutral: 'border-border bg-muted/50 text-muted-foreground',
}

/** Maps every domain status (appointments + invoices) to a visual tone. */
const STATUS_TONE: Record<string, StatusTone> = {
  // Appointment statuses
  scheduled: 'info',
  confirmed: 'progress',
  in_progress: 'active',
  completed: 'success',
  no_show: 'warning',
  // Invoice statuses
  draft: 'neutral',
  pending: 'info',
  partial_paid: 'progress',
  paid: 'success',
  overdue: 'warning',
  // Shared
  cancelled: 'neutral',
}

interface StatusBadgeProps {
  status: string
  label?: ReactNode
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const tone = STATUS_TONE[status] ?? 'neutral'
  return (
    <Badge variant="outline" className={cn('font-medium', TONE_CLASS[tone], className)}>
      {label ?? status}
    </Badge>
  )
}
