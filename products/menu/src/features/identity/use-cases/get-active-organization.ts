import 'server-only'
import type { IdentityGateway, Organization } from '../ports'

/**
 * Resolves the user's "active" organization. Zitadel doesn't model an
 * active org today — we derive a deterministic one from the user's
 * Zitadel memberships (the first one). Returns null when the user
 * belongs to no orgs yet (onboarding case).
 */
export async function getActiveOrganization(
  identity: IdentityGateway,
  userId: string,
): Promise<Organization | null> {
  const orgs = await identity.listOrganizations(userId)
  return orgs[0] ?? null
}
