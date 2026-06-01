import 'server-only'
import type { RestaurantImportPort } from '../ports'
import type { RestaurantImport } from '../schema'

export type CreateFromJsonResult =
  | { ok: true; slug: string; restaurantId: string; menuId: string }
  | { ok: false; error: string }

/**
 * Pure orchestration: hand the validated tree + the resolved tenant/slug to
 * the port. Tenant creation and slug allocation happen in the action shell —
 * they require the session and live outside the slice's boundary.
 */
export async function createRestaurantFromJson(
  port: RestaurantImportPort,
  input: { tenantId: string; slug: string; data: RestaurantImport },
): Promise<CreateFromJsonResult> {
  try {
    const { restaurantId, menuId } = await port.importRestaurant(input)
    return { ok: true, slug: input.slug, restaurantId, menuId }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
