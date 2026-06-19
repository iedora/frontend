import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getSession, isStaff } from '@iedora/product-menu/features/auth'
import { LANGUAGE_META } from '@iedora/product-menu/features/i18n'
import {
  ADD_ANOTHER_QUERY_KEY,
  ADD_ANOTHER_QUERY_VALUE,
  ONBOARDING_STEPS,
  findPendingOnboardingRestaurant,
  tenantHasRestaurant,
} from '@iedora/product-menu/features/menu-onboarding'
import { signInUrl } from '@iedora/product-menu/shared/auth-urls'
import { publicUrl } from '@iedora/product-menu/shared/url'
import { OnboardingForm } from './onboarding-form'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const session = await getSession()
  if (!session) redirect(signInUrl(publicUrl(ONBOARDING_STEPS.name.path).toString()))

  // Staff bypass: iedora-admin / iedora-support never need to onboard
  // a tenant of their own — the dashboard is cross-tenant for them.
  if (isStaff(session)) redirect('/menu/dashboard')

  const sp = (await searchParams) ?? {}
  const addAnotherRaw = sp[ADD_ANOTHER_QUERY_KEY]
  const addAnother =
    (Array.isArray(addAnotherRaw) ? addAnotherRaw[0] : addAnotherRaw) ===
    ADD_ANOTHER_QUERY_VALUE

  // Tier the gate by the session's tenant state:
  //   - no tenant on the token       → first sign-in, render step 1
  //   - tenant has a pending wizard  → resume into step 2
  //   - tenant has only completions  → bounce to dashboard unless the
  //                                    operator opted in via the
  //                                    dashboard CTA (`?addAnother=1`)
  if (session.tenantId) {
    const pending = await findPendingOnboardingRestaurant()
    if (pending)
      redirect(ONBOARDING_STEPS.menu.buildPath({ slug: pending.slug }))
    if (!addAnother && (await tenantHasRestaurant())) {
      redirect('/menu/dashboard')
    }
  }

  const t = await getTranslations('Onboarding')
  const locale = await getLocale()
  const languages = LANGUAGE_META.map((l) => ({ code: l.code, label: l.nativeName }))

  return (
    <div className="min-h-screen bg-background text-foreground" data-test-id="onboarding-name-page">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-7">
        {/* Progress — step 1 of 2 */}
        <div className="mb-9 flex items-center gap-3" aria-label={t('steps.label')}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 rounded-full bg-primary" />
          </div>
          <span className="text-[13px] font-semibold text-muted-foreground" data-test-id="onboarding-stepper">
            {t('steps.counter', { index: 1, total: 2 })}
          </span>
        </div>
        <OnboardingForm languages={languages} locale={locale} />
      </div>
    </div>
  )
}
