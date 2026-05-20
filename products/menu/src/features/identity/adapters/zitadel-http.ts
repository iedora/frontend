import 'server-only'
import { env } from '@/shared/env'
import type { IdentityGateway, Organization } from '../ports'

/**
 * Production IdentityGateway. Calls Zitadel's REST management API using
 * menu's IAM_OWNER service-account PAT (minted in TF by
 * `zitadel_personal_access_token.menu_sa`).
 *
 * Why the PAT and not the user's own access_token: a standard OIDC user
 * token doesn't carry the management-scope claims required to
 * `_search` memberships across orgs or create a new org at onboarding.
 * The PAT carries the menu_sa machine user's IAM_OWNER role.
 *
 * Errors are coerced to friendly return values (null / empty list / false)
 * because the call sites are server actions and DAL guards — they already
 * branch on missing data. We log unexpected failures so they show up in
 * the container logs.
 *
 * Endpoint set (subject to Zitadel deprecation watch — both v1 endpoints
 * still work in 4.15.x as of 2026-05):
 *   - POST /v2/users/{userId}/memberships/_search  (list memberships)
 *   - POST /admin/v1/orgs                          (create org)
 *   - POST /management/v1/orgs/{orgId}/members    (add user as ORG_OWNER)
 */
type SearchResponse<T> = { result?: T[]; details?: { totalResult?: string } }

type ZitadelMembership = {
  userId?: string
  // Exactly one of these is populated per row:
  iam?: { name?: string }
  orgId?: string
  orgName?: string
  projectId?: string
  projectGrantId?: string
  // Display fields, only populated for org-level rows in 2.x+
  displayName?: string
}

function slugify(name: string): string {
  // NFD splits accented chars into base + combining-mark; stripping the
  // marks gives a clean ASCII fallback (Café → cafe, München → munchen).
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const url = `${env.ZITADEL_ISSUER_URL.replace(/\/$/, '')}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.ZITADEL_MANAGEMENT_TOKEN}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...(init.headers ?? {}),
      },
      // Identity calls are user-scoped and short-lived; no Next caching.
      cache: 'no-store',
    })
  } catch (err) {
    console.error(`[identity] ${init.method ?? 'GET'} ${url} threw`, err)
    return null
  }
  if (!res.ok) {
    console.error(
      `[identity] ${init.method ?? 'GET'} ${url} → ${res.status}`,
      await res.text().catch(() => ''),
    )
    return null
  }
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

export const zitadelHttpIdentity: IdentityGateway = {
  async listOrganizations(userId) {
    const data = await call<SearchResponse<ZitadelMembership>>(
      `/v2/users/${encodeURIComponent(userId)}/memberships/_search`,
      {
        method: 'POST',
        body: JSON.stringify({ query: { offset: '0', limit: 100, asc: true } }),
      },
    )
    if (!data?.result) return []
    // Filter to org-level memberships. IAM-level / project-level rows are
    // visible in this list too but don't represent a tenant for menu.
    const out: Organization[] = []
    for (const row of data.result) {
      if (!row.orgId) continue
      const name = row.orgName ?? row.displayName ?? row.orgId
      out.push({ id: row.orgId, name, slug: slugify(name) })
    }
    return out
  },

  async createOrganization(userId, name, _slug) {
    // 1. Create the org.
    const created = await call<{ id?: string }>(`/admin/v1/orgs`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (!created?.id) return null

    // 2. Add the user as ORG_OWNER of the new org. The header switches
    //    the management API's org context to the freshly minted one.
    const added = await call<unknown>(
      `/management/v1/orgs/${encodeURIComponent(created.id)}/members`,
      {
        method: 'POST',
        headers: { 'x-zitadel-orgid': created.id },
        body: JSON.stringify({ userId, roles: ['ORG_OWNER'] }),
      },
    )
    if (added === null) {
      console.error(
        `[identity] org ${created.id} created but member add failed for user ${userId}`,
      )
      // Don't roll back — leaking an empty org on the IdP is preferable
      // to leaving the user without a tenant on second-try. Pre-customer.
    }

    return { id: created.id, name, slug: slugify(name) }
  },

  async setActiveOrganization(_userId, _organizationId) {
    // Zitadel doesn't model "the user's active org" — a user can be a
    // member of N orgs and the choice is client-side. Menu's identity
    // slice picks the first membership today. Future multi-membership
    // would back this with a tiny `user_preferences` table or a Zitadel
    // user metadata write. Today: no-op.
    return true
  },
}
