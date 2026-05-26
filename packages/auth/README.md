# @iedora/auth

> Shared auth surface for the iedora estate — better-auth instance,
> Drizzle schema, and the role/scope access-control taxonomy. One config,
> shared by every product (menu today, core tomorrow).

Cookies seal on `.iedora.com` so a session created on any iedora surface
is readable by any other.

## What's in here

```
src/
  auth.ts          The canonical better-auth instance (lazy-init).
  client.ts        Browser-side client (better-auth/react + plugin set).
  db.ts            Postgres pool against the iedora_auth DB (lazy).
  permissions.ts   `statement` + `ac` + role bindings (member/admin/owner + iedoraAdmin).
  schema.ts        Drizzle schema for the iedora_auth tables.
  index.ts         Server entry — re-exports the above.
drizzle/           Generated SQL migrations.
drizzle.config.ts  Migration tooling config.
```

## Quick start (consumer side)

```ts
// products/<x>/src/shared/auth.ts
import { getAuth } from '@iedora/auth'
export const auth = getAuth()

// products/<x>/src/app/api/auth/[...all]/route.ts
import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/shared/auth'
export const { GET, POST } = toNextJsHandler(auth)

// In a server component / route handler:
import { headers } from 'next/headers'
import { auth } from '@/shared/auth'
const session = await auth.api.getSession({ headers: await headers() })
```

## Env vars (consumer-provided)

| Var | What |
|---|---|
| `CORE_DATABASE_URL` | Postgres URL pointing at the `core` DB (auth tables live in the `core` schema) |
| `IEDORA_AUTH_SECRET`       | ≥ 32-char secret used to sign session tokens |
| `IEDORA_AUTH_BASE_URL`     | Canonical URL of the auth API (e.g. `https://core.iedora.com`) |
| `IEDORA_AUTH_TRUSTED_ORIGINS` | Comma-separated list of allowed origins for CSRF |
| `IEDORA_AUTH_COOKIE_DOMAIN` | Override the parent-domain cookie scope (default `.iedora.com`; use `localhost` in dev) |

## Permission model

Two axes:

- **Per-org roles** — `member` / `admin` / `owner`. Resolved against the
  user's `member.role` row for their `session.activeOrganizationId`.
- **Cross-tenant role** — `iedora-admin`. Granted on the user row, NOT
  through membership; a single grant covers every org + every product.

Permission checks at the call site:

```ts
const ok = await auth.api.userHasPermission({
  body: {
    permission: { qrCodes: ['write'] },        // resource → actions
  },
  headers: await headers(),
})
if (!ok) redirect('/forbidden')
```

Extending the taxonomy = one entry in `permissions.ts::statement`,
optionally plus a line per role binding.

## Migrations

Schema lives in `src/schema.ts`. Edit it, then:

```bash
bun run db:generate    # produces drizzle/NNNN_…sql
bun run db:migrate     # applies pending migrations
```

In prod, Stage 3 of the deploy pipeline runs `db:migrate` against the
`core` database (see `infra/app-state/`).

## Why a shared package, not a per-product config

- One source of truth for the role/permission taxonomy — adding a new
  scope is one PR, not "remember to update menu AND core".
- Cookies stay valid across surfaces because every consumer points at
  the SAME better-auth instance shape (same secret, same plugin set).
- The `core` DB / `core` schema is owned here too — schema drift cannot
  happen silently in a consumer's local migrations folder.

## Not in scope

- SMTP wiring (`requireEmailVerification` is off; flip it on when SMTP
  lands).
- Audit log surface — that's the `core` product's concern (Phase 2).
- Admin UI for org/user management — also `core` (Phase 2).
