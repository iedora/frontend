import 'server-only'
import { cache } from 'react'
import { genkanHttpIdentity } from '@/features/identity'
import { betterAuthGateway } from './adapters/better-auth'
import { verifySession as _verifySession } from './use-cases/verify-session'
import { getEffectiveOrganizationId as _getEffectiveOrganizationId } from './use-cases/get-effective-organization-id'
import { requireActiveOrganization as _requireActiveOrganization } from './use-cases/require-active-organization'
import { requireRestaurantAccess as _requireRestaurantAccess } from './use-cases/require-restaurant-access'
import { requireRestaurantBySlug as _requireRestaurantBySlug } from './use-cases/require-restaurant-by-slug'

/**
 * Public API of the auth slice. These convenience wrappers bind the
 * production AuthGateway (Better Auth + Drizzle) AND the IdentityGateway
 * (Genkan over HTTP), and are wrapped in React's `cache()` so a guard
 * called repeatedly during a single render (page + child server
 * components) hits the wire once.
 *
 * For unit tests, import the use-case functions directly from
 * `./use-cases/*` and pass fake `AuthGateway` + `IdentityGateway`.
 */
export const verifySession = cache(() => _verifySession(betterAuthGateway))

export const getEffectiveOrganizationId = cache((userId: string) =>
  _getEffectiveOrganizationId(genkanHttpIdentity, userId),
)

export const requireActiveOrganization = cache(() =>
  _requireActiveOrganization(betterAuthGateway, genkanHttpIdentity),
)

export const requireRestaurantAccess = cache((restaurantId: string) =>
  _requireRestaurantAccess(betterAuthGateway, genkanHttpIdentity, restaurantId),
)

export const requireRestaurantBySlug = cache((slug: string) =>
  _requireRestaurantBySlug(betterAuthGateway, genkanHttpIdentity, slug),
)

export type { AuthGateway } from './ports'
