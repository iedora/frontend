---
name: e2e
description: Use to run the Playwright E2E suite end-to-end. Brings up Postgres/Redis/MinIO via docker compose, ensures migrations are applied, starts the Next.js dev server in background, then runs `bun run test:e2e`. Use after UI/auth/data-layer changes when the typecheck alone isn't enough to confirm the feature works.
---

# e2e

The repo has a Playwright suite covering auth, onboarding, redirects, tenancy, builder, public menu, settings (theme + identity + uploads), QR codes. UI/feature work isn't done until it passes — `AGENTS.md` rule: "test the UI in a browser before reporting the task as complete."

Specs live under `tests/e2e/specs/<module>/<name>.spec.ts` (auth, tenancy, menu-builder, public-menu, settings, qr, uploads). Adding a spec = pick the right module dir; Playwright discovers recursively.

## Flow

1. **Infra up:** `docker compose up -d` (Postgres + Redis + MinIO). Wait until `docker compose ps` shows all healthy.
2. **Apply pending migrations:** `bun run db:migrate`. Idempotent if already applied.
3. **Start dev server in background:** run `bun run dev` in background and watch for "Ready in" before proceeding. Note the port.
4. **Run the suite:** `bun run test:e2e`. For interactive debugging use `bun run test:e2e:ui` or `bun run test:e2e:debug` (sets `PWDEBUG=1`).
5. **Stop the dev server** when done (or leave running if iterating).

## When tests fail

- Read the Playwright HTML report (printed at end of run).
- Re-run a single failing test: `bunx playwright test path/to/spec.ts -g "test name"`.
- Use the `playwright` MCP for interactive exploration of the failing flow — it controls a live browser.
- Tenancy regressions are the highest-priority failure class — they map to the hard rule #1 violation. Don't skip or `.fixme` them.

## Don't

- Don't mock the database in these tests. They hit the real Postgres in docker compose; that's the whole point.
- Don't run `bun run build` and use the production server for E2E — the suite is wired for `next dev`.
- Don't commit `.env` from the test run.
