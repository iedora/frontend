import 'server-only'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { auth } from './better-auth-instance'
import { db } from '@/shared/db/client'
import { restaurant } from '@/shared/db/schema'
import type { AuthGateway } from '../ports'

/**
 * Production AuthGateway. Wraps Better Auth (session lookup) and Drizzle
 * (restaurant lookup scoped to a tenant id). The tenant-membership check
 * itself runs against Genkan via `@/features/identity` — see the use-cases.
 *
 * Server-only: `headers()` and the Drizzle client never belong on the client.
 */
export const betterAuthGateway: AuthGateway = {
  async getSession() {
    return auth.api.getSession({ headers: await headers() })
  },

  async findRestaurantByIdInOrg({ restaurantId, organizationId }) {
    const rows = await db
      .select({ id: restaurant.id })
      .from(restaurant)
      .where(
        and(
          eq(restaurant.id, restaurantId),
          eq(restaurant.organizationId, organizationId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  },

  async findRestaurantBySlugInOrg({ slug, organizationId }) {
    const rows = await db
      .select({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      })
      .from(restaurant)
      .where(
        and(
          eq(restaurant.slug, slug),
          eq(restaurant.organizationId, organizationId),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  },
}
