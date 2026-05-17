import 'server-only'
import { redirect } from 'next/navigation'
import { GENKAN_URL } from '@/shared/brand'
import type { AuthGateway } from '../ports'

/**
 * Resolves the current session. Redirects to Genkan's /login when the
 * caller is unauthenticated; returns the (non-null) session otherwise.
 *
 * Genkan (genkan.iedora.com) owns sign-in/sign-up UI. After successful
 * sign-in Genkan redirects to menu's `/api/auth/oauth2/callback/genkan`,
 * which Better Auth's `generic-oauth` plugin handles automatically.
 */
export async function verifySession(auth: AuthGateway) {
  const session = await auth.getSession()
  if (!session?.user) {
    redirect(`${GENKAN_URL}/login`)
  }
  return session
}
