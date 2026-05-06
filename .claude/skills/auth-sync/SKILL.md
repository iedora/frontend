---
name: auth-sync
description: Use after changing Better Auth plugins or core auth config in lib/auth.ts (e.g. enabling/disabling the organization plugin, adding email/OTP, changing fields). Runs `bun run auth:generate` to regenerate the auth tables in lib/db/schema.ts, shows the diff, then guides the migration cycle.
---

# auth-sync

Better Auth's CLI writes the auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, plus plugin-specific tables) directly into `lib/db/schema.ts`. Hand-edits to those blocks will be overwritten — re-run after any plugin change.

## Flow

1. **Stash uncommitted edits** to `lib/db/schema.ts` if any (or commit them) — the generator rewrites that file.
2. **Run** `bun run auth:generate` (alias for `better-auth generate`).
3. **`git diff lib/db/schema.ts`** — confirm only the auth blocks changed. Domain tables (`restaurant`, `menu`, `category`, `item`) and their relations should be untouched.
4. **Hand off to `db-migrate`:** run `bun run db:generate`, review the SQL, then `bun run db:migrate`.
5. **Re-run `bun run typecheck`.**

## Common pitfalls

- The generator may reorder or reformat unchanged blocks — review the diff carefully and don't assume it's a no-op.
- If the diff touches domain tables, something is wrong — abort and investigate before generating a migration.
- Plugin-specific session fields (e.g. `activeOrganizationId` from the organization plugin) appear on `session` — keep `lib/dal.ts` in sync if you read new ones.

## When NOT to use

- Pure runtime config changes in `lib/auth.ts` that don't touch plugins or schema-affecting options — no regeneration needed.
- Changes to `lib/auth-client.ts` (client-side) — never affect tables.
