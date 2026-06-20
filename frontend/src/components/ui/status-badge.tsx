import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusTone = 'success' | 'warning' | 'info' | 'progress' | 'active' | 'neutral'

/** Single source of truth for status pill colors across the whole app. */
const TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  progress: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  active: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
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
