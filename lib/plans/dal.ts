import 'server-only'
import { cache } from 'react'
import { count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organization, restaurant } from '@/lib/db/schema'
import { getPlan } from './registry'
import type { Plan, PlanFeature } from './types'

/**
 * Resolves an organization's current plan. `cache()` so the same render pass
 * (page component + server actions called within) hits the DB once.
 */
export const getOrganizationPlan = cache(
  async (organizationId: string): Promise<Plan> => {
    const rows = await db
      .select({ plan: organization.plan })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)
    return getPlan(rows[0]?.plan)
  },
)

export const getOrganizationRestaurantCount = cache(
  async (organizationId: string): Promise<number> => {
    const rows = await db
      .select({ value: count() })
      .from(restaurant)
      .where(eq(restaurant.organizationId, organizationId))
    return Number(rows[0]?.value ?? 0)
  },
)

export type RestaurantGate =
  | { ok: true }
  | { ok: false; reason: 'restaurant-limit'; limit: number; current: number }

/**
 * Why this returns rather than throws: the call site is a form action that
 * surfaces the error as inline copy ("upgrade to add more"). A thrown error
 * would 500 the action and the user would lose context.
 */
export async function canAddRestaurant(
  organizationId: string,
): Promise<RestaurantGate> {
  const [plan, current] = await Promise.all([
    getOrganizationPlan(organizationId),
    getOrganizationRestaurantCount(organizationId),
  ])
  if (current >= plan.limits.restaurants) {
    return {
      ok: false,
      reason: 'restaurant-limit',
      limit: plan.limits.restaurants,
      current,
    }
  }
  return { ok: true }
}

export function planHas(plan: Plan, feature: PlanFeature): boolean {
  return plan.features.has(feature)
}
