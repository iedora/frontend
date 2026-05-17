import 'server-only'
import type { IdentityGateway } from '@/features/identity'

/**
 * Resolves the user's effective organizationId by asking Genkan (via the
 * identity slice). Genkan is the source of truth for org membership — we
 * pick the first organization it returns. Returns null only when the user
 * truly has no organizations yet (onboarding case).
 *
 * Why this lives in the auth slice (and not identity): callers reach for
 * it as part of "tell me who I am and what tenant context to render in".
 * The identity slice owns the I/O; the auth slice owns the policy
 * decision (which org to default to when there's more than one).
 */
export async function getEffectiveOrganizationId(
  identity: IdentityGateway,
  userId: string,
): Promise<string | null> {
  const orgs = await identity.listOrganizations(userId)
  return orgs[0]?.id ?? null
}
