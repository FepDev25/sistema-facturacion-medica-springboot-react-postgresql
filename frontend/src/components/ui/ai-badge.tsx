import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Small pill that consistently tags every AI-powered feature across the app. */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary',
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      IA
    </span>
  )
}

/** Brand-tinted sparkle tile used as the icon in AI panel headers. */
export function AiIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
        className,
      )}
    >
      <Sparkles className="h-4 w-4" />
    </span>
  )
}
