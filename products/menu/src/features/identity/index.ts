import 'server-only'
import { cache } from 'react'
import { genkanHttpIdentity } from './adapters/genkan-http'
import { listOrganizations as _listOrganizations } from './use-cases/list-organizations'
import { createOrganization as _createOrganization } from './use-cases/create-organization'
import { getActiveOrganization as _getActiveOrganization } from './use-cases/get-active-organization'
import { setActiveOrganization as _setActiveOrganization } from './use-cases/set-active-organization'

/**
 * Public API of the identity slice. Convenience wrappers bind the
 * production IdentityGateway (`genkanHttpIdentity`); read functions are
 * wrapped in React's `cache()` so repeated calls during a single render
 * hit Genkan once.
 *
 * For unit tests, import the use-case functions directly from
 * `./use-cases/*` and pass a fake `IdentityGateway`.
 */
export const listOrganizations = cache((userId: string) =>
  _listOrganizations(genkanHttpIdentity, userId),
)

export const getActiveOrganization = cache((userId: string) =>
  _getActiveOrganization(genkanHttpIdentity, userId),
)

export const createOrganization = (
  userId: string,
  name: string,
  slug: string,
) => _createOrganization(genkanHttpIdentity, userId, name, slug)

export const setActiveOrganization = (userId: string, organizationId: string) =>
  _setActiveOrganization(genkanHttpIdentity, userId, organizationId)

// Re-export the production adapter so sibling slices (auth) can wire
// their own use-cases against the same IdentityGateway instance without
// punching through this slice's internals.
export { genkanHttpIdentity } from './adapters/genkan-http'

export type { IdentityGateway, Organization } from './ports'
export type { CreateOrganizationResult } from './use-cases/create-organization'
