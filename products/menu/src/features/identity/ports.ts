/**
 * The shape of an organization as far as menu cares about it. The wire
 * format coming off Zitadel is normalised here so call sites never grow a
 * dependency on it.
 */
export type Organization = {
  id: string
  name: string
  slug: string
}

/**
 * IdentityGateway — the slice's only dependency on Zitadel.
 *
 * Every operation that needs to act on the user's organizations goes
 * through this port. Production wires `zitadelHttpIdentity`, which calls
 * Zitadel's management API using the menu service-account PAT. Tests
 * wire fakes.
 *
 * The port is intentionally narrow: only the calls menu's UI actually
 * needs. The full Zitadel surface (roles, invitations, IDP config) is
 * reachable via Zitadel's console — menu doesn't need to mirror it.
 */
export interface IdentityGateway {
  /**
   * Lists the organizations the given user belongs to. Used by the auth
   * DAL to verify a caller has access to a tenant — a restaurant is in
   * the user's tenant set iff its `organizationId` is in this list.
   */
  listOrganizations(userId: string): Promise<Organization[]>

  /**
   * Creates a new Zitadel organization with the given name + slug,
   * returning the id Zitadel assigned. `userId` identifies the caller —
   * the adapter adds them as ORG_OWNER of the new org.
   */
  createOrganization(
    userId: string,
    name: string,
    slug: string,
  ): Promise<Organization | null>

  /**
   * Mark the given org as the user's active organization. Zitadel doesn't
   * model an active org today; the production adapter is a no-op that
   * returns true. The hook remains so we can add a `user_preferences`
   * mapping later without rewiring every call site.
   */
  setActiveOrganization(userId: string, organizationId: string): Promise<boolean>
}
