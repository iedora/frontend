import { createAuthClient } from 'better-auth/react'
import { genericOAuthClient } from 'better-auth/client/plugins'

// Menu is a pure OAuth client of Genkan. The only sign-in entrypoint is
// `authClient.signIn.oauth2({ providerId: 'genkan', callbackURL: '/dashboard' })`
// — Better Auth's generic-oauth plugin handles the redirect to Genkan's
// `/oauth2/authorize`, the callback, code exchange, and session creation.
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const { signIn, signOut, useSession } = authClient
