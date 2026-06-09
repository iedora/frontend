# Runbook — deploy

Deploy is owned by the **`iedora/infra`** platform (Docker Swarm + Ansible +
OpenTofu), not this repo.

- **Image** — this repo's CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml),
  the `image` job) builds `apps/web/Dockerfile` and pushes `ghcr.io/iedora/web`
  on every push to `main`.
- **Deploy** — `iedora/infra` pulls that image and runs it as a Swarm stack
  (`stacks/web` + `roles/web`): one-shot migrate, then deploy. See the
  `iedora/infra` README.
- **Runtime secrets** — live in `iedora/infra` (`stacks/web/secrets.env`, SOPS),
  not here. The old `apps/web/.env.prod` + `bun prod:env:*` flow is retired.
- **Object storage (R2)** — managed by `iedora/infra` (`tofu/r2.tf`).
- **Databases** — the migrator auto-creates `core` + `menu` on first run.

> Historical: this app previously deployed via Coolify + `homelab-iac`. That
> platform is retired; the prior runbook is in git history.
