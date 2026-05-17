import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'
import { GENKAN_URL } from '@/shared/brand'

const protectedPrefixes = ['/dashboard', '/onboarding']

/**
 * Optimistic cookie-presence check (AGENTS.md hard rule #5). The real auth
 * gate runs in the DAL — this only avoids a wasted RSC render when the
 * caller obviously isn't signed in.
 *
 * Menu's session cookie is now LOCAL (host-only on menu.iedora.com) — sign
 * in lives on Genkan and is routed there via OAuth. So when the cookie is
 * missing we send the browser to Genkan's /login.
 */
export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const sessionCookie = getSessionCookie(req)
  if (!sessionCookie) {
    const url = new URL(`${GENKAN_URL}/login`)
    url.searchParams.set('next', `${req.nextUrl.origin}${path}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
