import 'server-only'
import type { AuthGateway } from '../ports'
import { resolveRestaurantAccess } from './resolve-restaurant-access'

/**
 * Tenant-scoped guard keyed by restaurant id. Tenant users must belong
 * to the org that owns the restaurant; staff (iedora-admin /
 * iedora-support) read cross-tenant. See `resolveRestaurantAccess` for
 * the shared staff-vs-tenant logic.
 *
 * Returns `{ session, tenantId, restaurantId }` so callers don't need
 * a follow-up query for downstream tenant-scoped writes.
 */
export async function requireRestaurantAccess(
  auth: AuthGateway,
  restaurantId: string,
) {
  const { session, tenantId, restaurant } = await resolveRestaurantAccess(
    auth,
    {
      spanName: 'auth.require-restaurant-access',
      spanAttributes: { 'iedora.restaurant_id_requested': restaurantId },
      findAnyOrg: () => auth.findRestaurantByIdAnyOrg(restaurantId),
      findInOrg: (tenantId) =>
        auth.findRestaurantByIdInOrg({ restaurantId, tenantId }),
    },
  )
  return { session, tenantId, restaurantId: restaurant.id }
}
