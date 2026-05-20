# syntax=docker/dockerfile:1.24
# House dev container. Multi-stage: Bun image builds the Astro static
# output, Caddy image serves it.
#
# This Dockerfile is FOR DEV USE — a menu-team dev who doesn't have
# Bun/Astro installed locally can still bring house up alongside
# their menu work via `just dev --only house` (or via the TUI). The
# container serves `dist/` as-built; no HMR. Active house dev still
# uses `cd products/house && bun run dev` on the host.
#
# Production deploys via Cloudflare Workers Static Assets (TF — see
# infra/tofu/ for menu's pattern; house's worker lives in shared
# infra after the R2 consolidation). The CF Workers path doesn't use
# this image; both code paths just rebuild the same dist/.

# ── Stage 1: build the Astro static output ──────────────────────────────────
FROM oven/bun:1.3-debian AS build
WORKDIR /workspace

# Workspace lockfile + shared tsconfig + every dependent package. The
# `products/menu/package.json` stub keeps the workspace glob resolving
# without dragging menu's source into this image.
COPY package.json bun.lock tsconfig.base.json ./
COPY packages packages
# Both workspace products' package.json — bun.lock is keyed on the real
# workspace shape, so a stub here would fail the --frozen-lockfile
# check. Only the manifest is copied for menu (no source), so the
# image still doesn't carry menu's code.
COPY products/menu/package.json  products/menu/package.json
COPY products/house/package.json products/house/package.json

RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --ignore-scripts

# Now drop in house's source and build. dist/ ends up at
# /workspace/products/house/dist
COPY products/house/src         products/house/src
COPY products/house/astro.config.mjs products/house/
COPY products/house/tsconfig.json    products/house/

WORKDIR /workspace/products/house
RUN bun run build

# ── Stage 2: serve dist/ via busybox httpd ──────────────────────────────────
# ~5 MB image, single static binary. We don't need gzip / HTTP/2 / certs
# / rewrites for a dev viewing the landing page; Caddy and nginx were
# overkill. Default MIME-type table covers .html/.css/.js/.svg/.png/.woff2.
FROM busybox:1.37
WORKDIR /www
COPY --from=build /workspace/products/house/dist ./
EXPOSE 80
CMD ["httpd", "-f", "-v", "-p", "80", "-h", "/www"]

LABEL org.opencontainers.image.source="https://github.com/eduvhc/iedora"
