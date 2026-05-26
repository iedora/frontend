import { createAuthClient } from 'better-auth/react'
import { organizationClient, adminClient } from 'better-auth/client/plugins'
import { ac, roles, iedoraAdmin } from './permissions'

/**
 * Browser-side auth client. Mirrors the plugin set configured in
 * `./auth.ts` so client calls (`authClient.signIn.email(...)`,
 * `authClient.organization.create(...)`, ...) get the same type surface
 * as the server.
 *
 * `baseURL` defaults to same-origin — every iedora product hosts its
 * own `/api/auth/*` proxy that forwards to the canonical auth instance,
 * so the client never points cross-domain in the browser.
 *
 * Consumers do:
 *   ```ts
 *   import { authClient } from '@iedora/auth/client'
 *   const { data } = await authClient.signIn.email({ email, password })
 *   ```
 */
export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      roles,
    }),
    adminClient({
      ac,
      roles: { 'iedora-admin': iedoraAdmin },
    }),
  ],
})

export type AuthClient = typeof authClient
