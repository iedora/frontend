# identity slice

Federates organization ownership through Genkan (the IdaaS at
`genkan.iedora.com`). Menu owns ZERO organization data — every read/write
goes over HTTP to Genkan's Better Auth organization plugin, using the
user's OAuth access token stored in `account.access_token`.

## Public API (`@/features/identity`)

- `listOrganizations(userId)` → `Organization[]` (memoized per request)
- `getActiveOrganization(userId)` → `Organization | null` (first org)
- `createOrganization(userId, name, slug)` → `CreateOrganizationResult`
- `setActiveOrganization(userId, organizationId)` → `boolean`

## Port

`IdentityGateway` (in `./ports.ts`). Production adapter:
`./adapters/genkan-http.ts`.

## Why this exists

The menu DB used to carry `auth.organization`, `auth.member`, `auth.invitation`.
That coupled menu's schema to Better Auth's organization plugin and made
Genkan-as-IdaaS impossible. Now: Genkan owns the canonical org record,
menu only knows that "organizationId X is in the user's tenant set" via
this slice. Tenant scoping in the auth DAL goes through `listOrganizations`.
