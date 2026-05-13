import 'server-only'
import { cache } from 'react'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invoice, type InvoiceStatus } from '@/lib/db/schema'
import type { PlanCode } from '@/lib/plans'

export type Invoice = {
  id: string
  plan: PlanCode
  periodStart: Date
  periodEnd: Date
  amountCents: number
  currency: string
  status: InvoiceStatus
  issuedAt: Date
  paidAt: Date | null
}

/**
 * Years with at least one invoice for the org, newest first. The page uses
 * this to render the year filter chips — never hardcode the current year, the
 * UI should follow what's actually billed.
 *
 * Postgres requires SELECT DISTINCT's ORDER BY expressions to match exactly
 * one of the select-list expressions; the year extract is bound to a single
 * `sql` fragment so the cast and the sort agree on identity.
 */
export const getInvoiceYears = cache(
  async (organizationId: string): Promise<number[]> => {
    const yearExpr = sql<number>`extract(year from ${invoice.issuedAt})::int`
    const rows = await db
      .selectDistinct({ year: yearExpr })
      .from(invoice)
      .where(eq(invoice.organizationId, organizationId))
      .orderBy(desc(yearExpr))
    return rows.map((r) => Number(r.year))
  },
)

export const getInvoicesForYear = cache(
  async (organizationId: string, year: number): Promise<Invoice[]> => {
    const start = new Date(Date.UTC(year, 0, 1))
    const end = new Date(Date.UTC(year + 1, 0, 1))
    const rows = await db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.organizationId, organizationId),
          gte(invoice.issuedAt, start),
          lt(invoice.issuedAt, end),
        ),
      )
      .orderBy(desc(invoice.issuedAt))
    return rows.map((r) => ({
      id: r.id,
      plan: r.plan,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      amountCents: r.amountCents,
      currency: r.currency,
      status: r.status,
      issuedAt: r.issuedAt,
      paidAt: r.paidAt,
    }))
  },
)
