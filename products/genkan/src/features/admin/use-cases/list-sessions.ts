import 'server-only'
import { desc, eq, gt } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { session, user } from '@/shared/db/schema'

export type AdminSessionRow = {
  id: string
  token: string
  userId: string
  userEmail: string
  userName: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  expiresAt: Date
  impersonatedBy: string | null
}

/**
 * All currently-valid sessions across the platform. Filters out expired
 * sessions at query time — Better Auth cleans these up lazily, but the
 * admin view should only show actionable rows.
 */
export async function listAllActiveSessions(
  opts: { limit?: number } = {},
): Promise<AdminSessionRow[]> {
  const limit = Math.min(opts.limit ?? 200, 500)

  const rows = await db
    .select({
      id: session.id,
      token: session.token,
      userId: session.userId,
      userEmail: user.email,
      userName: user.name,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      impersonatedBy: session.impersonatedBy,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(gt(session.expiresAt, new Date()))
    .orderBy(desc(session.createdAt))
    .limit(limit)

  return rows
}
