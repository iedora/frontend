import { NextRequest, NextResponse } from 'next/server'
import { buildEndSessionUrl } from '@/features/auth/adapters/oidc'
import { SESSION_COOKIE } from '@/features/auth/adapters/session'
import { env } from '@/shared/env'

/**
 * `POST /api/auth/logout` — clears menu's session cookie and bounces to
 * Zitadel's end-session endpoint, which drops the Zitadel-side session
 * and redirects back to `/`.
 *
 * GET also accepted to keep `<Link>`-based logout buttons trivial — the
 * form-encoded POST is the secure path, but GET-with-CSRF-token is a
 * pre-customer scope concern. Re-tighten if needed.
 */
function handle(_req: NextRequest): Response {
  const postLogout = `${env.MENU_PUBLIC_URL}/`
  const end = buildEndSessionUrl({ postLogoutRedirectUri: postLogout })
  const res = NextResponse.redirect(end, { status: 302 })
  res.cookies.delete({ name: SESSION_COOKIE, path: '/' })
  return res
}

export const GET = handle
export const POST = handle
