import 'server-only'
import type { IdentityGateway, Organization } from '../ports'

export type CreateOrganizationResult =
  | { ok: true; organization: Organization }
  | { ok: false; error: 'slug-taken' | 'failed' }

/**
 * Creates an organization on Genkan and returns the assigned id. Genkan
 * mints the owner membership for `userId` itself — menu doesn't need a
 * follow-up call. The "failed" / "slug-taken" branching is naive because
 * Genkan's HTTP API only signals via 4xx/5xx today; treat any null as
 * "could not create" and let the caller render generic copy.
 */
export async function createOrganization(
  identity: IdentityGateway,
  userId: string,
  name: string,
  slug: string,
): Promise<CreateOrganizationResult> {
  const result = await identity.createOrganization(userId, name, slug)
  if (!result) return { ok: false, error: 'failed' }
  return { ok: true, organization: result }
}
