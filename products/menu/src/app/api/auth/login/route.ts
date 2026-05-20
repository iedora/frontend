import { NextRequest, NextResponse } from 'next/server'
import { buildAuthorizationStart } from '@/features/auth/adapters/oidc'
import {
  isSameOriginPath,
  makeOidcFlowAdapter,
  OIDC_FLOW_COOKIE,
  OIDC_FLOW_TTL_SECONDS,
} from '@/features/auth/adapters/session'
import { env } from '@/shared/env'

/**
 * `GET /api/auth/login?next=<path>`
 *
 * Starts the OIDC dance:
 *   1. Mint a PKCE verifier + state.
 *   2. Stuff both into a short-lived encrypted cookie (10 min).
 *   3. 302 the browser to Zitadel's `/oauth/v2/authorize` URL.
 *
 * The `next` query is sanitised down to a same-origin path so the
 * post-callback redirect can't escape menu's host. Re-validated again
 * on read in the callback handler (defence in depth).
 */
const flowCookies = makeOidcFlowAdapter(env.MENU_SESSION_SECRET)

export async function GET(req: NextRequest): Promise<Response> {
  const nextRaw = req.nextUrl.searchParams.get('next')
  const next = nextRaw && isSameOriginPath(nextRaw) ? nextRaw : '/dashboard'

  const redirectUri = `${env.MENU_PUBLIC_URL}/api/auth/callback`
  const { url, state, codeVerifier } = await buildAuthorizationStart(redirectUri)

  const flow = await flowCookies.seal({ state, codeVerifier, next })

  const res = NextResponse.redirect(url, { status: 302 })
  res.cookies.set(OIDC_FLOW_COOKIE, flow, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: OIDC_FLOW_TTL_SECONDS,
  })
  return res
}
