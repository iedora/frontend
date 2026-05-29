'use client'

import * as React from 'react'

export type StepperStep = {
  /** Stable identifier — matched against `currentKey` to resolve state. */
  key: string
  /** 1-indexed position rendered inside pending/current circles. */
  index: number
  /** Already-localised label rendered under the circle. */
  label: string
}

export type StepperProps = {
  steps: ReadonlyArray<StepperStep>
  /** Key of the active step. Must match one of `steps[i].key`. */
  currentKey: string
  /** Already-localised `aria-label` on the <ol>. */
  ariaLabel: string
  /**
   * Already-localised "Step N of M" string. Rendered as mono caption
   * below the rail. Omit to hide the counter line entirely.
   */
  counterLabel?: string
  /** Test hook injected on the wrapper. */
  testId?: string
  /**
   * Test-hook factory for per-step `<li>` elements. Receives the step
   * key, returns the value placed on `data-test-id`. Omit to skip.
   */
  stepTestId?: (key: string) => string
  className?: string
}

type StepState = 'done' | 'current' | 'pending'

function resolveState(
  step: StepperStep,
  currentIndex: number,
): StepState {
  if (step.index === currentIndex) return 'current'
  return step.index < currentIndex ? 'done' : 'pending'
}

/**
 * Visual lifecycle indicator: a row of numbered circles connected by
 * a progress rail. Done = filled ink + check; current = cinnabar-ringed
 * number; pending = hollow.
 *
 * Translation-agnostic on purpose — every string is passed in already
 * localised. Wrap with a product-specific component that resolves
 * `useTranslations()` or similar.
 *
 * Geometry derives from `steps.length` so this works for 2, 3, N steps
 * without edits.
 */
export function Stepper({
  steps,
  currentKey,
  ariaLabel,
  counterLabel,
  testId,
  stepTestId,
  className,
}: StepperProps) {
  const current = steps.find((s) => s.key === currentKey) ?? steps[0]
  const currentIndex = current?.index ?? 1
  const total = steps.length

  // % of the rail BETWEEN circles that should read as completed.
  const filledRailPct =
    total > 1
      ? Math.max(0, Math.min(100, ((currentIndex - 1) / (total - 1)) * 100))
      : 0

  return (
    <div
      className={
        'flex w-full max-w-[420px] flex-col items-stretch gap-3' +
        (className ? ` ${className}` : '')
      }
      data-test-id={testId}
    >
      <ol
        className="relative flex items-start justify-between"
        aria-label={ariaLabel}
      >
        <div
          aria-hidden="true"
          className="absolute left-4 right-4 top-4 h-px bg-[var(--ink-14)]"
        />
        <div
          aria-hidden="true"
          className="absolute left-4 top-4 h-px bg-[var(--ink)] transition-[width] duration-300"
          style={{ width: `calc((100% - 2rem) * ${filledRailPct / 100})` }}
        />

        {steps.map((step) => {
          const state = resolveState(step, currentIndex)
          return (
            <li
              key={step.key}
              className="relative z-10 flex flex-1 flex-col items-center gap-2"
              data-test-id={stepTestId?.(step.key)}
              data-state={state}
            >
              <span
                className={
                  state === 'current'
                    ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cinnabar)] font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--paper)] ring-4 ring-[var(--cinnabar)]/15'
                    : state === 'done'
                      ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)]'
                      : 'flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ink-22)] bg-[var(--paper)] font-[family-name:var(--mono)] text-[12px] text-[var(--ink-55)]'
                }
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {state === 'done' ? (
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      d="M3.5 8.5l3 3 6-6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.index
                )}
              </span>
              <span
                className={
                  state === 'current'
                    ? 'text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]'
                    : 'text-[11px] uppercase tracking-[0.18em] text-[var(--ink-55)]'
                }
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
      {counterLabel ? (
        <p
          className="text-center font-[family-name:var(--mono)] text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-55)]"
          data-test-id={testId ? `${testId}-counter` : undefined}
        >
          {counterLabel}
        </p>
      ) : null}
    </div>
  )
}
