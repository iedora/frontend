import 'server-only'
import { desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { oauthClient } from '@/shared/db/schema'

export type AdminOAuthClientRow = {
  id: string
  clientId: string
  name: string | null
  redirectUris: string[]
  scopes: string[]
  disabled: boolean
  skipConsent: boolean
  createdAt: Date | null
}

export async function listApplications(
  opts: { search?: string; limit?: number } = {},
): Promise<AdminOAuthClientRow[]> {
  const limit = Math.min(opts.limit ?? 200, 500)
  const term = opts.search?.trim()
  const where = term
    ? or(
        ilike(oauthClient.name, `%${term}%`),
        ilike(oauthClient.clientId, `%${term}%`),
      )
    : undefined

  const rows = await db
    .select({
      id: oauthClient.id,
      clientId: oauthClient.clientId,
      name: oauthClient.name,
      redirectUris: oauthClient.redirectUris,
      scopes: oauthClient.scopes,
      disabled: oauthClient.disabled,
      skipConsent: oauthClient.skipConsent,
      createdAt: oauthClient.createdAt,
    })
    .from(oauthClient)
    .where(where)
    .orderBy(desc(oauthClient.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    name: r.name,
    redirectUris: r.redirectUris ?? [],
    scopes: r.scopes ?? [],
    disabled: Boolean(r.disabled),
    skipConsent: Boolean(r.skipConsent),
    createdAt: r.createdAt,
  }))
}

export type AdminOAuthClientDetail = AdminOAuthClientRow & {
  clientSecret: string | null
  uri: string | null
  policy: string | null
  tos: string | null
  contacts: string[]
  grantTypes: string[]
  responseTypes: string[]
  tokenEndpointAuthMethod: string | null
  postLogoutRedirectUris: string[]
  type: string | null
  updatedAt: Date | null
}

export async function getApplicationById(
  id: string,
): Promise<AdminOAuthClientDetail | null> {
  const [row] = await db
    .select()
    .from(oauthClient)
    .where(eq(oauthClient.id, id))
    .limit(1)
  if (!row) return null
  return {
    id: row.id,
    clientId: row.clientId,
    clientSecret: row.clientSecret,
    name: row.name,
    redirectUris: row.redirectUris ?? [],
    scopes: row.scopes ?? [],
    disabled: Boolean(row.disabled),
    skipConsent: Boolean(row.skipConsent),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    uri: row.uri,
    policy: row.policy,
    tos: row.tos,
    contacts: row.contacts ?? [],
    grantTypes: row.grantTypes ?? [],
    responseTypes: row.responseTypes ?? [],
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    postLogoutRedirectUris: row.postLogoutRedirectUris ?? [],
    type: row.type,
  }
}
