import 'server-only'
import { redirect } from 'next/navigation'
import { isStaffRole } from '@iedora/auth/role-presets'
import type { Span } from '@opentelemetry/api'
import {
  tenantContext,
  tracer,
  IEDORA_RESTAURANT_ID,
  IEDORA_TENANT_ID,
} from '@iedora/observability'
import type { AuthGateway, Session } from '../ports'
import { requireActiveOrganization } from './require-active-organization'
import { verifySession } from './verify-session'

/**
 * Shared core of `requireRestaurantAccess` (by id) and
 * `requireRestaurantBySlug` (by slug). Encodes the one rule we keep
 * repeating:
 *
 *   - Staff (iedora-admin / iedora-support) read cross-tenant. The
 *     lookup hits `findRestaurantBy*AnyOrg`; the tenant id comes from
 *     the row itself.
 *   - Tenant users read scoped. Their active tenant must own the
 *     restaurant or the guard redirects to /menu/dashboard.
 *
 * The tenant-context (`enterWith`) + span outcome stamping happens
 * here in both paths so downstream Drizzle / S3 / fetch spans get
 * the resolved tenant attributes regardless of which guard called us.
 *
 * Caller passes:
 *   - `spanName` / `spanAttributes` — observability identity.
 *   - `findAnyOrg` — staff path lookup. Returns the restaurant + its
 *     real tenantId.
 *   - `findInOrg` — tenant path lookup. Takes the caller's active
 *     tenantId, returns the restaurant (no tenantId — we already
 *     have it).
 *
 * The two existing call-sites prove the pattern is symmetric; adding
 * a third (e.g. resolve-restaurant-by-qr) is a 6-liner that doesn't
 * re-derive staff-branching, tenant-context, or span outcome logic.
 */
export async function resolveRestaurantAccess<
  R extends { id: string },
>(
  auth: AuthGateway,
  spec: {
    spanName: string
    spanAttributes: Record<string, string>
    findAnyOrg: () => Promise<(R & { tenantId: string }) | null>
    findInOrg: (tenantId: string) => Promise<R | null>
  },
): Promise<{ session: Session; tenantId: string; restaurant: R }> {
  return tracer.startActiveSpan(spec.spanName, async (span: Span) => {
    for (const [k, v] of Object.entries(spec.spanAttributes)) {
      span.setAttribute(k, v)
    }
    try {
      const session = await verifySession(auth)
      const isStaff = isStaffRole(session.user.role)

      let row: R | null
      let tenantId: string

      if (isStaff) {
        const found = await spec.findAnyOrg()
        if (!found) {
          span.setAttribute('iedora.auth.outcome', 'forbidden')
          redirect('/menu/dashboard')
        }
        tenantId = found.tenantId
        row = found
      } else {
        const ctx = await requireActiveOrganization(auth)
        tenantId = ctx.tenantId
        row = await spec.findInOrg(tenantId)
        if (!row) {
          span.setAttribute('iedora.auth.outcome', 'forbidden')
          redirect('/menu/dashboard')
        }
      }

      tenantContext.enterWith({ restaurantId: row.id, tenantId })
      span.setAttribute(IEDORA_TENANT_ID, tenantId)
      span.setAttribute(IEDORA_RESTAURANT_ID, row.id)
      span.setAttribute('iedora.auth.outcome', 'allowed')
      return { session, tenantId, restaurant: row }
    } finally {
      span.end()
    }
  })
}
