# admin slice

Platform-admin surface for Genkan. Everything under `/admin/*` is gated by
this slice's `requireAdmin` guard, and the read-side use-cases here are the
single source the admin pages reach for.

## Bootstrapping the first admin

There is **no** in-app self-promotion path. To grant platform-admin to a
user, flip the `role` column on `user` directly:

```sql
update "user" set role = 'admin' where email = 'you@example.com';
```

Every subsequent admin action (banning users, registering OAuth clients,
etc.) is performed through the UI by an already-admin account.

## Public API (`@/features/admin`)

- `requireAdmin(returnTo?)` — DAL guard. Redirects unauthenticated visitors
  to `/login?return_to=...`; returns `notFound()` (deliberately not a 403)
  for signed-in non-admins so the admin URL surface stays hidden. Returns
  the session for callers.

Read use-cases (import directly from `./use-cases/*` inside admin pages):

- `listUsers` / `getUserById` / `listSessionsForUser` /
  `listOrganizationsForUser` / `countUsers`
- `listOrganizations` / `getOrganizationById` /
  `listMembersForOrganization` / `listInvitationsForOrganization`
- `listApplications` / `getApplicationById`
- `listGrants`
- `listAllActiveSessions`
- `listAuditEvents`

## Mutations

Mutations live in the `app/admin/**/actions.ts` files (Next does not
traverse `'use server'` through barrels reliably). Every mutation calls
`requireAdmin()` first and then either Better Auth's server API
(`auth.api.banUser`, `auth.api.setRole`, `auth.api.removeUser`,
`auth.api.impersonateUser`, `auth.api.revokeUserSession`,
`auth.api.createOrganization`, `auth.api.deleteOrganization`,
`auth.api.updateOrganization`, `auth.api.createInvitation`,
`auth.api.removeMember`) — for state with policy / plugin invariants — or
direct Drizzle writes for trivial deletes (consents, OAuth clients).

## Audit

`listAuditEvents` is a derived view (banned users + impersonated sessions
+ registered OAuth clients) until a dedicated `audit_log` table lands.
That table is intentionally out of scope for this slice — when added, swap
`list-audit.ts` for a single ordered scan and keep the page identical.
