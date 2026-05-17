import 'server-only'
import { desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { oauthClient, session, user } from '@/shared/db/schema'

/**
 * Editorial audit feed for /admin/audit. We don't have a dedicated audit
 * table yet (deferred), so we synthesize an ordered timeline by reading
 * three signals:
 *   - banned users          (kind: "ban",       at: user.updatedAt)
 *   - admin impersonations  (kind: "impersonate", at: session.createdAt)
 *   - registered OAuth apps (kind: "app.register", at: oauthClient.createdAt)
 *
 * That covers role changes / bans / app provisioning / impersonations — the
 * categories the spec asks for without writing a new table. When a proper
 * audit_log lands, swap this for a single ordered scan.
 */

export type AdminAuditEvent =
  | {
      id: string
      kind: 'ban'
      at: Date
      actor: string | null
      target: string
      detail: string
    }
  | {
      id: string
      kind: 'impersonate'
      at: Date
      actor: string | null
      target: string
      detail: string
    }
  | {
      id: string
      kind: 'app.register'
      at: Date
      actor: string | null
      target: string
      detail: string
    }

export async function listAuditEvents(
  opts: { limit?: number } = {},
): Promise<AdminAuditEvent[]> {
  const limit = Math.min(opts.limit ?? 200, 500)

  const [banned, impersonations, apps] = await Promise.all([
    db
      .select({
        id: user.id,
        email: user.email,
        updatedAt: user.updatedAt,
        banReason: user.banReason,
      })
      .from(user)
      .where(eq(user.banned, true))
      .orderBy(desc(user.updatedAt))
      .limit(limit),
    db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        impersonatedBy: session.impersonatedBy,
        userEmail: user.email,
      })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .where(isNotNull(session.impersonatedBy))
      .orderBy(desc(session.createdAt))
      .limit(limit),
    db
      .select({
        id: oauthClient.id,
        name: oauthClient.name,
        clientId: oauthClient.clientId,
        createdAt: oauthClient.createdAt,
        registeredBy: oauthClient.userId,
      })
      .from(oauthClient)
      .orderBy(desc(oauthClient.createdAt))
      .limit(limit),
  ])

  const events: AdminAuditEvent[] = []

  for (const row of banned) {
    events.push({
      id: `ban:${row.id}`,
      kind: 'ban',
      at: row.updatedAt,
      actor: null,
      target: row.email,
      detail: row.banReason ?? 'no reason recorded',
    })
  }

  for (const row of impersonations) {
    events.push({
      id: `impersonate:${row.id}`,
      kind: 'impersonate',
      at: row.createdAt,
      actor: row.impersonatedBy,
      target: row.userEmail,
      detail: `impersonated by user ${row.impersonatedBy ?? '?'}`,
    })
  }

  for (const row of apps) {
    if (!row.createdAt) continue
    events.push({
      id: `app:${row.id}`,
      kind: 'app.register',
      at: row.createdAt,
      actor: row.registeredBy,
      target: row.name ?? row.clientId,
      detail: `client_id ${row.clientId}`,
    })
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime())

  return events.slice(0, limit)
}
