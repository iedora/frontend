'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@iedora/design-system'
import { resetPasswordAction, type ResetFormState } from '@iedora/product-menu/features/auth/actions'

const FIELD =
  'w-full rounded-[12px] border border-border bg-card px-4 py-3 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cinnabar)_22%,transparent)]'
const LABEL = 'mb-1.5 block text-[14px] font-semibold text-foreground'

export function ResetPasswordForm({ token, signInHref }: { token: string; signInHref: string }) {
  const t = useTranslations('Auth.resetPassword')
  const [state, action, pending] = useActionState<ResetFormState, FormData>(
    resetPasswordAction,
    { error: null, done: false },
  )

  // Success — no auto-login, so route the user to sign in with the new password.
  if (state.done) {
    return (
      <div className="flex flex-col gap-5" data-test-id="reset-done">
        <p className="rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[14px] leading-[1.5] text-[var(--green)]">
          {t('done')}
        </p>
        <Link
          href={signInHref}
          className="inline-flex w-full items-center justify-center rounded-[12px] bg-primary px-4 py-3 text-[16px] font-semibold text-white no-underline transition-colors hover:bg-[var(--cinnabar-deep)]"
          data-test-id="reset-sign-in-cta"
        >
          {t('signInCta')}
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className={LABEL}>{t('passwordLabel')}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          autoFocus
          placeholder={t('passwordPlaceholder')}
          className={FIELD}
          data-test-id="reset-password"
        />
      </div>
      <div>
        <label htmlFor="confirm" className={LABEL}>{t('confirmLabel')}</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={FIELD}
          data-test-id="reset-confirm"
        />
      </div>
      {state.error && (
        <p className="text-[13px] text-[var(--danger)]" role="alert" data-test-id="reset-error">
          {t(state.error === 'mismatch' ? 'errorMismatch' : 'errorInvalid')}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="!w-full !justify-center"
        disabled={pending}
        data-test-id="reset-submit"
      >
        {pending ? t('submitting') : t('submit')}
      </Button>
      <p className="text-center text-[14px] text-muted-foreground">
        {t('remembered')}{' '}
        <Link href={signInHref} className="font-semibold text-primary no-underline" data-test-id="reset-sign-in-link">
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  )
}
