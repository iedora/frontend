import 'server-only'
import type { IdentityGateway, Organization } from '../ports'

/**
 * Resolves the user's "active" organization. Better Auth's local session
 * (here) doesn't store `activeOrganizationId` since the organization
 * plugin is genkan-side — instead we derive a deterministic active org
 * from genkan's organization list (the first one).
 *
 * Returns null when the user belongs to no orgs yet (onboarding case).
 */
export async function getActiveOrganization(
  identity: IdentityGateway,
  userId: string,
): Promise<Organization | null> {
  const orgs = await identity.listOrganizations(userId)
  return orgs[0] ?? null
}
