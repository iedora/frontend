import type { Session } from './adapters/better-auth-instance'

/**
 * AuthGateway — the slice's only direct dependency on Better Auth +
 * the local DB.
 *
 * Use-cases call methods on this interface; production wires it to
 * `betterAuthGateway`. Tests wire fakes.
 *
 * Org-membership checks no longer live behind this port — the org graph
 * is owned by Genkan now. See `@/features/identity` for those calls. This
 * port stays narrow: session lookup + restaurant-row lookup by id/slug
 * scoped to a tenant id (whose membership the caller has already
 * verified via the identity slice).
 */
export interface AuthGateway {
  /**
   * Returns the current Better Auth session, or null if the caller is
   * unauthenticated. Backed by `auth.api.getSession({ headers })` in prod.
   */
  getSession(): Promise<Session | null>

  /**
   * Looks up a restaurant by id and confirms it belongs to `organizationId`.
   * The caller MUST have already verified that the user belongs to
   * `organizationId` (via `@/features/identity`).
   */
  findRestaurantByIdInOrg(params: {
    restaurantId: string
    organizationId: string
  }): Promise<{ id: string } | null>

  /**
   * Same as `findRestaurantByIdInOrg` but resolved by URL slug. Returns the
   * subset of columns guards expose to callers (`id`, `name`, `slug`).
   */
  findRestaurantBySlugInOrg(params: {
    slug: string
    organizationId: string
  }): Promise<{ id: string; name: string; slug: string } | null>
}
