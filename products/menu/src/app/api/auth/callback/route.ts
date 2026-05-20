import { NextRequest, NextResponse } from 'next/server'
import { exchangeAuthorizationCode } from '@/features/auth/adapters/oidc'
import {
  makeOidcFlowAdapter,
  makeSessionAdapter,
  OIDC_FLOW_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from '@/features/auth/adapters/session'
import { env } from '@/shared/env'

/**
 * `GET /api/auth/callback?code=…&state=…`
 *
 * Zitadel-side callback. Reads the flow cookie minted by /api/auth/login,
 * exchanges the authorization code for tokens, persists the menu session
 * cookie, and redirects to the original `next` path.
 *
 * On any failure (missing/bad flow cookie, state mismatch, exchange
 * error) we clear the flow cookie and bounce to `/?auth=failed` so the
 * landing page can render a friendly message. We deliberately do NOT
 * surface the raw OIDC error to the user.
 */
const flowCookies = makeOidcFlowAdapter(env.MENU_SESSION_SECRET)
const sessions = makeSessionAdapter(env.MENU_SESSION_SECRET)

function failure(req: NextRequest): NextResponse {
  const url = new URL('/', req.nextUrl.origin)
  url.searchParams.set('auth', 'failed')
  const res = NextResponse.redirect(url, { status: 302 })
  res.cookies.delete(OIDC_FLOW_COOKIE)
  return res
}

export async function GET(req: NextRequest): Promise<Response> {
  const flowJwe = req.cookies.get(OIDC_FLOW_COOKIE)?.value
  if (!flowJwe) return failure(req)

  const flow = await flowCookies.open(flowJwe)
  if (!flow) return failure(req)

  let result
  try {
    result = await exchangeAuthorizationCode({
      currentUrl: new URL(req.url),
      codeVerifier: flow.codeVerifier,
      expectedState: flow.state,
    })
  } catch (err) {
    console.error('[auth/callback] code exchange failed', err)
    return failure(req)
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const sessionJwe = await sessions.seal({
    user: { id: result.sub, email: result.email, name: result.name },
    expiresAt,
  })

  const nextUrl = new URL(flow.next, req.nextUrl.origin)
  const res = NextResponse.redirect(nextUrl, { status: 302 })

  res.cookies.set(SESSION_COOKIE, sessionJwe, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  // Flow cookie is single-use — drop it.
  res.cookies.delete({ name: OIDC_FLOW_COOKIE, path: '/api/auth' })

  return res
}
