import 'server-only'
import { redirect } from 'next/navigation'
import type { IdentityGateway } from '@/features/identity'
import type { AuthGateway } from '../ports'
import { requireActiveOrganization } from './require-active-organization'

/**
 * Tenant-scoped guard: verifies the caller has a session, belongs to an
 * org on Genkan, and that org owns the given restaurant. Redirects to
 * /dashboard when the restaurant doesn't belong to one of the caller's
 * orgs. Returns the session, organizationId, and restaurantId for
 * downstream queries.
 */
export async function requireRestaurantAccess(
  auth: AuthGateway,
  identity: IdentityGateway,
  restaurantId: string,
) {
  const { session, organizationId } = await requireActiveOrganization(
    auth,
    identity,
  )
  const row = await auth.findRestaurantByIdInOrg({
    restaurantId,
    organizationId,
  })
  if (!row) redirect('/dashboard')
  return { session, organizationId, restaurantId }
}
