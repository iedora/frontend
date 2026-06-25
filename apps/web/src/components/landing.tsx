import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@iedora/ui/components/ui/button'
import { cn } from '@iedora/ui/lib/utils'

// Shared landing design language, used by BOTH the house (/house) and the menu
// product (/menu) pages so they read as one studio. Editorial: monospace
// section labels with hairline rules, soft-primary eyebrow pills, pill CTAs.
// Everything is token-based (dark/light safe) and 320px-safe (iPhone 4).

/** One max-width column with a responsive gutter that never overflows 320px. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1080px] px-5 sm:px-8', className)} {...props} />
}

/** Monospace section head with an optional index and a hairline rule. */
export function SectionLabel({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {index ? (
        <span className="font-mono text-[12px] font-semibold tracking-[0.16em] text-primary">{index}</span>
      ) : null}
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  )
}

/**
 * Handwritten-style accent — the "today's special" personality line. Italic
 * primary text with an optional hand-drawn underline squiggle. Use it for hero
 * kickers and small flourishes so the pages have a human, written-by-a-person
 * feel instead of a generic eyebrow pill.
 */
export function Accent({ children, underline = false }: { children: ReactNode; underline?: boolean }) {
  return (
    <span className="inline-flex flex-col items-start">
      <span className="font-heading text-[15px] font-semibold italic text-primary sm:text-[16px]">{children}</span>
      {underline ? (
        <svg width="64" height="7" viewBox="0 0 64 7" fill="none" className="mt-0.5 text-primary" aria-hidden="true">
          <path
            d="M2 4.5C11 1.5 21 6.5 32 4.5S53 1.5 62 4.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </span>
  )
}

const TAG_TONES = {
  live: 'bg-green-600/10 text-green-600',
  special: 'bg-amber-500/15 text-amber-600',
  primary: 'bg-primary/10 text-primary',
  muted: 'bg-muted text-muted-foreground',
} as const

/** Small status/category pill (Live, Today's special, chef's pick, …). */
export function Tag({
  tone = 'muted',
  dot = false,
  children,
}: {
  tone?: keyof typeof TAG_TONES
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        TAG_TONES[tone],
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

/** Pill CTA built on the shadcn Button (renders an anchor). */
export function CtaButton({
  href,
  children,
  full,
  variant = 'default',
}: {
  href: string
  children: ReactNode
  full?: boolean
  variant?: 'default' | 'secondary'
}) {
  return (
    <Button
      render={<a href={href} />}
      nativeButton={false}
      variant={variant}
      className={cn(
        'h-auto justify-center gap-2 rounded-full px-6 py-3 font-heading text-[15px] font-bold normal-case tracking-normal no-underline',
        full && 'w-full sm:w-auto',
      )}
    >
      {children}
    </Button>
  )
}
