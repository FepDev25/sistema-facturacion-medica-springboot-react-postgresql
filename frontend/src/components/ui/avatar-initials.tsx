import { cn } from '@/lib/utils'

/** Soft tints — each person gets a stable color derived from their name. */
const PALETTE = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-cyan-100 text-cyan-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-teal-100 text-teal-700',
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
