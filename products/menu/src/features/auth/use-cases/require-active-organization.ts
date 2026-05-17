import 'server-only'
import { redirect } from 'next/navigation'
import type { IdentityGateway } from '@/features/identity'
import type { AuthGateway } from '../ports'
import { verifySession } from './verify-session'
import { getEffectiveOrganizationId } from './get-effective-organization-id'

/**
 * Guarantees an authenticated session AND a resolved organizationId.
 * Redirects to /onboarding when the user has no organizations on Genkan
 * yet. Returns both so downstream guards don't need to re-query.
 *
 * The identity gateway is injected so tests can wire a fake against the
 * same use-case shape; production binds `genkanHttpIdentity` from the
 * slice's `index.ts`.
 */
export async function requireActiveOrganization(
  auth: AuthGateway,
  identity: IdentityGateway,
) {
  const session = await verifySession(auth)
  const organizationId = await getEffectiveOrganizationId(
    identity,
    session.user.id,
  )
  if (!organizationId) redirect('/onboarding')
  return { session, organizationId }
}
