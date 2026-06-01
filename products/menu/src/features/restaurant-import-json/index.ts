/**
 * Public API of the restaurant-import-json slice.
 *
 * Staff-only: creates a whole restaurant (tenant + restaurant + menu + categories
 * + items) from a single JSON payload. Used by the admin restaurants page.
 *
 * Server action lives at `apps/web/src/app/menu/dashboard/admin/restaurants/`
 * (Next 'use server' rules don't traverse barrels).
 */
export { restaurantImportSchema, type RestaurantImport } from './schema'
export type { RestaurantImportPort } from './ports'
export { drizzleRestaurantImport } from './adapters/drizzle'
export {
  createRestaurantFromJson,
  type CreateFromJsonResult,
} from './use-cases/create-restaurant-from-json'
export { importToPublicMenuLoaded } from './to-public'
