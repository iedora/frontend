import 'server-only'
import { redirect } from 'next/navigation'
import { signInUrl } from '@/shared/brand'
import type { AuthGateway } from '../ports'

/**
 * Resolves the current session. Redirects to menu's local /api/auth/login
 * (which mints PKCE+state cookies and bounces to Zitadel) when the caller
 * is unauthenticated; returns the (non-null) session otherwise.
 *
 * The redirect target is on menu's OWN host so the session cookie set on
 * the OIDC callback is same-origin with the page that asked for it.
 */
export async function verifySession(auth: AuthGateway) {
  const session = await auth.getSession()
  if (!session?.user) {
    redirect(signInUrl())
  }
  return session
}
