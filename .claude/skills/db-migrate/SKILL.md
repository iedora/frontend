---
name: db-migrate
description: Use when the user asks to change the database schema (add/remove/alter a column, add a table, change an index/constraint). Walks the canonical schema-first flow — edit lib/db/schema.ts, generate the migration with drizzle-kit, review the SQL, then apply it. Do NOT hand-write SQL migrations and do NOT use db:push outside throwaway dev tweaks.
---

# db-migrate

Hard rule from `AGENTS.md` #2: **schema is the source of truth, migrations are generated, not handwritten.**

## Flow

1. **Edit `lib/db/schema.ts`.** Add/change tables, columns, indexes, relations. Keep tenant-scoped tables (`restaurant`, `menu`, `category`, `item`) with their `restaurantId` column denormalized — the DAL relies on it.
2. **Generate the migration:** `bun run db:generate`. This writes a new SQL file under `drizzle/`.
3. **Read the generated SQL** and confirm it matches intent. Watch for:
   - Destructive changes (`DROP COLUMN`, `DROP TABLE`) — flag to user before applying.
   - Renames detected as drop+add — drizzle-kit may prompt; pick rename if that's the intent.
   - Missing `NOT NULL` defaults on existing tables — backfill before tightening.
4. **Apply:** `bun run db:migrate`. Confirm success.
5. **Re-run `bun run typecheck`** — schema type changes cascade.

## When to use `db:push` instead

Only for throwaway local exploration. Never on a branch that will be pushed. The committed migration files in `drizzle/` are the audit trail.

## Money columns

Always `priceCents: integer(...)` plus a separate `currency: text(...)`. Never floats. (Hard rule #6.)
