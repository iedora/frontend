# auth slice

Session resolution + tenant access guards. The DAL of the project lives here.

Menu is a pure OAuth client of Genkan (the IdaaS at `genkan.iedora.com`).
Org-membership data lives entirely on Genkan; this slice federates it via
`@/features/identity`.

## Public API (`@/features/auth`)

- `verifySession()` — redirects to Genkan's `/login` if no session
- `getEffectiveOrganizationId(userId)` — picks the user's first org on Genkan
- `requireActiveOrganization()` — verifies session + org, redirects to /onboarding otherwise
- `requireRestaurantAccess(id)` — verifies membership via Genkan, returns the restaurant
- `requireRestaurantBySlug(slug)` — same, resolved by URL slug

All wrappers are `React.cache()`-memoized per request.

## Ports

- `AuthGateway` (`./ports.ts`) — Better Auth + local Drizzle
- `IdentityGateway` (`@/features/identity/ports`) — Genkan's HTTP org API

Adapters:
- `./adapters/better-auth.ts` — production session + restaurant-row lookup
- `./adapters/better-auth-instance.ts` — Better Auth factory (generic-oauth client)
- `./client.ts` — Better Auth React client

## Why this exists

AGENTS.md hard rule #3 says auth checks live in the data layer, not in
layouts. Every page that touches `restaurant`/`menu`/`category`/`item`
must call one of these guards close to the data fetch.
