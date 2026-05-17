import 'server-only'
import type { IdentityGateway } from '../ports'

/**
 * Tells Genkan to flip the user's active organization. Used by the
 * onboarding flow after creating an org — keeps Genkan's session state
 * in sync so subsequent listOrganizations calls put the new org first.
 */
export async function setActiveOrganization(
  identity: IdentityGateway,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return identity.setActiveOrganization(userId, organizationId)
}
