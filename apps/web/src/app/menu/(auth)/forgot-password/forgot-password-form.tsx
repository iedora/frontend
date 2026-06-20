'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@iedora/design-system'
import { forgotPasswordAction, type ForgotFormState } from '@iedora/product-menu/features/auth/actions'

const FIELD =
  'w-full rounded-[12px] border border-border bg-card px-4 py-3 text-[16px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cinnabar)_22%,transparent)]'
const LABEL = 'mb-1.5 block text-[14px] font-semibold text-foreground'

export function ForgotPasswordForm({ signInHref }: { signInHref: string }) {
  const t = useTranslations('Auth.forgotPassword')
  const [state, action, pending] = useActionState<ForgotFormState, FormData>(
    forgotPasswordAction,
    { sent: false },
  )

  // Neutral confirmation — never reveals whether the address has an account.
  if (state.sent) {
    return (
      <div className="flex flex-col gap-5" data-test-id="forgot-sent">
        <p className="rounded-[12px] border border-[var(--green)] bg-[var(--green-soft)] px-4 py-3 text-[14px] leading-[1.5] text-[var(--green)]">
          {t('sent')}
        </p>
        <Link
          href={signInHref}
          className="text-center text-[14px] font-semibold text-primary no-underline"
          data-test-id="forgot-back-link"
        >
          {t('backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="email" className={LABEL}>{t('emailLabel')}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder={t('emailPlaceholder')}
          className={FIELD}
          data-test-id="forgot-email"
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="!w-full !justify-center"
        disabled={pending}
        data-test-id="forgot-submit"
      >
        {pending ? t('submitting') : t('submit')}
      </Button>
      <p className="text-center text-[14px] text-muted-foreground">
        {t('remembered')}{' '}
        <Link href={signInHref} className="font-semibold text-primary no-underline" data-test-id="forgot-sign-in-link">
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  )
}
