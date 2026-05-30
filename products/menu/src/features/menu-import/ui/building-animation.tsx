'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Cycles through editorial "building" copy while the AI works. Reads as
 * craft-in-progress rather than a spinner; one i18n key per step so the
 * cadence stays in the operator's language. The `<p>` remounts on each
 * tick so the fade-in CSS triggers; the cinnabar dot pulses for liveness.
 *
 * Reused by `MenuImportWizard` (importMenuBuilding*) and
 * `UpdateMenuDialog` (updateMenuBuilding*) — the two copies that used
 * to live inline are now collapsed here. Callers pass their own
 * `messageKeys` (in the `Restaurant` namespace) plus a stable
 * `testId` prefix for spec hooks.
 */
const STEP_MS = 2400

export function BuildingAnimation({
  messageKeys,
  testId,
}: {
  messageKeys: ReadonlyArray<string>
  /** `data-test-id` on the container + suffixed `-{index}` on the live <p>. */
  testId: string
}) {
  const t = useTranslations('Restaurant')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messageKeys.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % messageKeys.length)
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [messageKeys.length])

  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--ink-22)] px-6 py-10 text-center"
      role="status"
      aria-live="polite"
      data-test-id={testId}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--cinnabar)] ds-pulse"
      />
      <p
        key={index}
        className="text-base italic text-[var(--ink)] menu-import-building-line"
        data-test-id={`${testId}-line-${index}`}
        style={{ fontFamily: 'var(--serif)' }}
      >
        {t(messageKeys[index]!)}
      </p>
    </div>
  )
}
