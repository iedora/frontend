import 'server-only'
import { redirect } from 'next/navigation'
import type { IdentityGateway } from '@/features/identity'
import type { AuthGateway } from '../ports'
import { requireActiveOrganization } from './require-active-organization'

/**
 * Same as `requireRestaurantAccess` but resolved by URL slug. Returns the
 * matched restaurant subset (`id`, `name`, `slug`) so callers don't need a
 * follow-up query just to render the page header.
 */
export async function requireRestaurantBySlug(
  auth: AuthGateway,
  identity: IdentityGateway,
  slug: string,
) {
  const { session, organizationId } = await requireActiveOrganization(
    auth,
    identity,
  )
  const row = await auth.findRestaurantBySlugInOrg({ slug, organizationId })
  if (!row) redirect('/dashboard')
  return { session, organizationId, restaurant: row }
}
