import 'server-only'
import { and, desc, eq, type SQL } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { oauthClient, oauthConsent, user } from '@/shared/db/schema'

export type AdminGrantRow = {
  id: string
  userId: string | null
  userEmail: string | null
  clientId: string
  clientName: string | null
  scopes: string[]
  createdAt: Date | null
  updatedAt: Date | null
}

export async function listGrants(opts: {
  userId?: string
  clientId?: string
  limit?: number
} = {}): Promise<AdminGrantRow[]> {
  const limit = Math.min(opts.limit ?? 200, 500)

  const conditions: SQL[] = []
  if (opts.userId) conditions.push(eq(oauthConsent.userId, opts.userId))
  if (opts.clientId) conditions.push(eq(oauthConsent.clientId, opts.clientId))

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions)

  const rows = await db
    .select({
      id: oauthConsent.id,
      userId: oauthConsent.userId,
      userEmail: user.email,
      clientId: oauthConsent.clientId,
      clientName: oauthClient.name,
      scopes: oauthConsent.scopes,
      createdAt: oauthConsent.createdAt,
      updatedAt: oauthConsent.updatedAt,
    })
    .from(oauthConsent)
    .leftJoin(user, eq(user.id, oauthConsent.userId))
    .leftJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
    .where(where)
    .orderBy(desc(oauthConsent.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userEmail: r.userEmail,
    clientId: r.clientId,
    clientName: r.clientName,
    scopes: r.scopes ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}
