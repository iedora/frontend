import type { RestaurantImport } from './schema'

/**
 * Persists a fully-formed restaurant tree (restaurant + menu + categories +
 * items) in a single transaction. Half-imported restaurants are not a valid
 * outcome — either the whole tree lands or nothing does.
 *
 * Tenant + slug are resolved by the action shell (the only place with the
 * session) and handed in. The adapter trusts both.
 */
export interface RestaurantImportPort {
  importRestaurant(input: {
    tenantId: string
    slug: string
    data: RestaurantImport
  }): Promise<{ restaurantId: string; menuId: string }>
}
