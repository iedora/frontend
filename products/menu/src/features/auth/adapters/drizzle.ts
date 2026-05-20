import 'server-only'
import { cookies } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { restaurant } from '@/shared/db/schema'
import { env } from '@/shared/env'
import type { AuthGateway } from '../ports'
import {
  makeSessionAdapter,
  SESSION_COOKIE,
  type Session,
} from './session'

/**
 * Production AuthGateway. Wraps the menu session cookie (jose JWE) and
 * Drizzle (restaurant lookup scoped to a tenant id). The tenant-membership
 * check itself runs against Zitadel via `@/features/identity` — see the
 * use-cases.
 *
 * Server-only: `cookies()` and the Drizzle client never belong on the client.
 */
const sessions = makeSessionAdapter(env.MENU_SESSION_SECRET)

async function readSessionCookie(): Promise<Session | null> {
  const jar = await cookies()
  const raw = jar.get(SESSION_COOKIE)?.value
  if (!raw) return null
  return sessions.open(raw)
}

export const drizzleAuthGateway: AuthGateway = {
  getSession: readSessionCookie,

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
