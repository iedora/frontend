'use client'

import { useTranslations } from 'next-intl'
import { Stepper } from '@iedora/design-system'
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_KEYS,
  ONBOARDING_STEP_TOTAL,
  type OnboardingStepKey,
} from '../steps'

/**
 * Menu-specific binding over the design-system `<Stepper>` primitive.
 * Resolves i18n labels + counter copy from `next-intl` and maps the
 * onboarding step topology defined in `steps.ts`. Adding step 3 = add
 * an entry there; this file needs no edits.
 */
export function OnboardingStepper({
  current,
}: {
  current: OnboardingStepKey
}) {
  const t = useTranslations()
  const steps = ONBOARDING_STEP_KEYS.map((key) => ({
    key,
    index: ONBOARDING_STEPS[key].index,
    label: t(ONBOARDING_STEPS[key].labelKey),
  }))
  return (
    <Stepper
      steps={steps}
      currentKey={current}
      ariaLabel={t('Onboarding.steps.label')}
      counterLabel={t('Onboarding.steps.counter', {
        index: ONBOARDING_STEPS[current].index,
        total: ONBOARDING_STEP_TOTAL,
      })}
      testId="onboarding-stepper"
      stepTestId={(key) => `onboarding-stepper-step-${key}`}
    />
  )
}
