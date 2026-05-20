# auth slice

Session resolution + tenant access guards. The DAL of the project lives here.

Menu is a thin Zitadel OIDC client. Org membership lives on Zitadel; this
slice federates it via `@/features/identity`.

## Public API (`@/features/auth`)

- `verifySession()` — redirects to `/api/auth/login` if no session
- `getEffectiveOrganizationId(userId)` — first Zitadel org for the user
- `requireActiveOrganization()` — session + org, else `/onboarding`
- `requireRestaurantAccess(id)` — verifies membership + returns restaurant
- `requireRestaurantBySlug(slug)` — same, resolved by URL slug

All wrappers are `React.cache()`-memoized per request.

## Ports

- `AuthGateway` (`./ports.ts`) — session cookie + Drizzle restaurant lookup
- `IdentityGateway` (`@/features/identity/ports`) — Zitadel management API

Adapters:
- `./adapters/drizzle.ts` — production restaurant lookup + session-cookie read
- `./adapters/session.ts` — encrypted session cookie (jose, dir / A256GCM)
- `./adapters/oidc.ts` — openid-client v6 wrapper for the auth-code dance

## Routes

- `GET /api/auth/login?next=<path>` — mints PKCE+state, 302 to Zitadel
- `GET /api/auth/callback` — exchanges code, sets `menu_session` cookie
- `GET|POST /api/auth/logout` — clears cookie, 302 to Zitadel end-session

## Why this exists

AGENTS.md hard rule #3 says auth checks live in the data layer, not in
layouts. Every page that touches `restaurant`/`menu`/`category`/`item`
must call one of these guards close to the data fetch.
