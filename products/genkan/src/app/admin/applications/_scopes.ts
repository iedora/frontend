/**
 * Scope vocabulary surfaced in the registration dialog. Kept in sync with
 * the `scopes` list in `better-auth-instance.ts`. If we add a scope there,
 * add it here too (and vice versa).
 */
export const KNOWN_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'menu',
  'org:read',
  'org:admin',
] as const

export type KnownScope = (typeof KNOWN_SCOPES)[number]
