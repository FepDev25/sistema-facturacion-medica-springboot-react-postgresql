import { cn } from '@/lib/utils'

/** Soft tints — each person gets a stable color derived from their name. */
const PALETTE = [
  'bg-destructive/15 text-destructive',
  'bg-warning/15 text-warning',
  'bg-success/15 text-success',
  'bg-info/15 text-info',
  'bg-info/15 text-info',
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-primary/15 text-primary',
]

function getInitials(firstName?: string, lastName?: string) {
  const a = firstName?.trim()?.[0] ?? ''
  const b = lastName?.trim()?.[0] ?? ''
  return `${a}${b}`.toUpperCase() || '?'
}

function toneFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

interface AvatarInitialsProps {
  firstName?: string
  lastName?: string
  className?: string
}

export function AvatarInitials({ firstName, lastName, className }: AvatarInitialsProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold',
        toneFor(`${firstName ?? ''}${lastName ?? ''}`),
        className,
      )}
    >
      {getInitials(firstName, lastName)}
    </span>
  )
}
