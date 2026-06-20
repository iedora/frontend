import { getTranslations } from 'next-intl/server'
import { signInUrl } from '@iedora/product-menu/shared/auth-urls'
import { ForgotPasswordForm } from './forgot-password-form'

/**
 * Forgot-password page — request a reset link. RSC shell (title +
 * subtitle), then the client form that submits to `forgotPasswordAction`.
 * Matches the sign-in / sign-up rhythm; the (auth) layout owns the brand
 * + support chrome.
 */
export default async function ForgotPasswordPage() {
  const t = await getTranslations('Auth.forgotPassword')
  return (
    <div>
      <h1 className="font-[family-name:var(--display)] text-[28px] font-extrabold leading-[1.12] tracking-[-0.01em] text-foreground">
        {t('title')}
      </h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-muted-foreground">{t('subtitle')}</p>
      <div className="mt-7">
        <ForgotPasswordForm signInHref={signInUrl()} />
      </div>
    </div>
  )
}
