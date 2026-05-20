import 'server-only'
import { cache } from 'react'
import { zitadelHttpIdentity } from '@/features/identity'
import { drizzleAuthGateway } from './adapters/drizzle'
import { verifySession as _verifySession } from './use-cases/verify-session'
import { getEffectiveOrganizationId as _getEffectiveOrganizationId } from './use-cases/get-effective-organization-id'
import { requireActiveOrganization as _requireActiveOrganization } from './use-cases/require-active-organization'
import { requireRestaurantAccess as _requireRestaurantAccess } from './use-cases/require-restaurant-access'
import { requireRestaurantBySlug as _requireRestaurantBySlug } from './use-cases/require-restaurant-by-slug'

/**
 * Public API of the auth slice. These convenience wrappers bind the
 * production AuthGateway (encrypted session cookie + Drizzle) AND the
 * IdentityGateway (Zitadel management API), wrapped in React's `cache()`
 * so a guard called repeatedly during a single render hits the wire once.
 *
 * For unit tests, import the use-case functions directly from
 * `./use-cases/*` and pass fake `AuthGateway` + `IdentityGateway`.
 */

/**
 * Non-redirecting read of the menu session. Returns null when there's no
 * cookie / it's expired / tampered. Use for chrome that should render
 * the signed-in or signed-out variant without forcing a redirect (e.g.
 * dashboard layout, public landing).
 *
 * Layouts in Next 16 don't re-render on navigation — `redirect()` here
 * would leak across pages. Real gating uses `verifySession()` /
 * `requireRestaurantAccess()` close to the data fetch.
 */
export const getSession = cache(() => drizzleAuthGateway.getSession())

export const verifySession = cache(() => _verifySession(drizzleAuthGateway))

export const getEffectiveOrganizationId = cache((userId: string) =>
  _getEffectiveOrganizationId(zitadelHttpIdentity, userId),
)

export const requireActiveOrganization = cache(() =>
  _requireActiveOrganization(drizzleAuthGateway, zitadelHttpIdentity),
)

export const requireRestaurantAccess = cache((restaurantId: string) =>
  _requireRestaurantAccess(drizzleAuthGateway, zitadelHttpIdentity, restaurantId),
)

export const requireRestaurantBySlug = cache((slug: string) =>
  _requireRestaurantBySlug(drizzleAuthGateway, zitadelHttpIdentity, slug),
)

export type { AuthGateway } from './ports'
export type { Session } from './adapters/session'
