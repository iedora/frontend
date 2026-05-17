/**
 * The shape of an organization as far as menu cares about it. Whatever
 * shape Genkan's API returns is normalised here so call sites never grow a
 * dependency on the wire format.
 */
export type Organization = {
  id: string
  name: string
  slug: string
}

/**
 * IdentityGateway — the slice's only dependency on Genkan (the IdaaS).
 *
 * Every operation that needs to act on the user's organizations goes
 * through this port. Production wires `genkanHttpIdentity`, which calls
 * Genkan's HTTP organization API using the user's OAuth access token from
 * the local `account` row. Tests wire fakes.
 *
 * The port is intentionally narrow: only the calls menu's UI actually
 * needs. The full Better Auth organization plugin surface (roles, member
 * management, invitations) is reachable directly via Genkan's UI — menu
 * doesn't need to mirror all of it.
 */
export interface IdentityGateway {
  /**
   * Lists the organizations the given user belongs to. Used by the auth
   * DAL to verify a caller has access to a tenant — a restaurant is in
   * the user's tenant set iff its `organizationId` is in this list.
   */
  listOrganizations(userId: string): Promise<Organization[]>

  /**
   * Creates a new organization on Genkan with the given name + slug,
   * returning the id Genkan assigned. `userId` identifies the caller —
   * Genkan needs it to mint the owner membership.
   */
  createOrganization(
    userId: string,
    name: string,
    slug: string,
  ): Promise<Organization | null>

  /**
   * Tells Genkan to set the given org as the user's active organization.
   * Idempotent. Returns true on success.
   */
  setActiveOrganization(userId: string, organizationId: string): Promise<boolean>
}
