import 'server-only'
import type { IdentityGateway, Organization } from '../ports'

/**
 * Lists every organization the user belongs to (per Genkan). Pure
 * pass-through — the gateway already normalises the wire format. Caller
 * is responsible for caching at the request scope (see slice index).
 */
export async function listOrganizations(
  identity: IdentityGateway,
  userId: string,
): Promise<Organization[]> {
  return identity.listOrganizations(userId)
}
