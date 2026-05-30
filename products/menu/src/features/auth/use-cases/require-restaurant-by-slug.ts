import 'server-only'
import type { AuthGateway } from '../ports'
import { resolveRestaurantAccess } from './resolve-restaurant-access'

/**
 * Same as `requireRestaurantAccess` but resolved by URL slug. Returns
 * the matched restaurant subset (`id`, `name`, `slug`) so callers
 * don't need a follow-up query just to render the page header. See
 * `resolveRestaurantAccess` for the shared staff-vs-tenant logic.
 */
export async function requireRestaurantBySlug(
  auth: AuthGateway,
  slug: string,
) {
  const { session, tenantId, restaurant } = await resolveRestaurantAccess<{
    id: string
    name: string
    slug: string
  }>(auth, {
    spanName: 'auth.require-restaurant-by-slug',
    spanAttributes: { 'iedora.restaurant_slug': slug },
    findAnyOrg: () => auth.findRestaurantBySlugAnyOrg(slug),
    findInOrg: (tenantId) =>
      auth.findRestaurantBySlugInOrg({ slug, tenantId }),
  })
  return { session, tenantId, restaurant }
}
