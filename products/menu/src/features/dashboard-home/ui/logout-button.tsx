'use client'

import { useTranslations } from 'next-intl'
import { authClient } from '@/features/auth/client'
import { GENKAN_URL } from '@/shared/brand'
import { Button } from '@iedora/design-system'

export function LogoutButton() {
  const t = useTranslations('AppHeader')
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        // Hits menu's local /api/auth/sign-out, which clears menu's own
        // session cookie. Genkan still holds its own session — sign-out
        // there happens when the user re-visits its /login page (or
        // explicitly signs out via Genkan's UI).
        await authClient.signOut()
        window.location.assign(`${GENKAN_URL}/login`)
      }}
    >
      {t('logout')}
    </Button>
  )
}
