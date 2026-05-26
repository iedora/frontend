# Renders the full Docker Compose file that the Hetzner box runs.
#
# Every shared container (postgres, openobserve, cloudflared, backups) is
# declared here as a service in the compose document. Tofu renders the
# YAML; cloud-init drops it on the box at first boot and a single
# `terraform_data.iedora_sync` resource (see sync.tf) pushes updates on
# day-2 changes.
#
# Identity lives in `@iedora/auth` (better-auth) running inside each
# product container — no IdP container on the box, no auth.iedora.com.
#
# The kreuzwerker/docker provider is intentionally NOT used — putting it
# on the apply graph forced multi-pass applies (SSH MaxStartups),
# state-rm dances on destroy, and known-hosts rotation on every IP
# change. Letting the box own its containers (via compose + systemd)
# collapses all of that to one SSH session that only fires when the
# rendered compose hash changes.

locals {
  # Paths inside the VPS — cloud-init writes here, the systemd unit
  # runs `docker compose -f /etc/iedora/docker-compose.yml ...`.
  iedora_etc_dir   = "/etc/iedora"
  postgres_data    = "/root/infra-postgres/data"
  openobserve_data = "/root/infra-openobserve/openobserve-data"

  # init.sql lives at /etc/iedora/postgres-init/init.sql, bind-mounted
  # into the postgres container at /docker-entrypoint-initdb.d/init.sql.
  postgres_init_sql = file("${path.module}/../postgres/init.sql")

  # systemd unit that runs the compose stack. Source-of-truth lives
  # in templates/iedora.service so both first-boot (cloud-init) and
  # day-2 (sync.tf) read the same bytes.
  systemd_unit = file("${path.module}/templates/iedora.service")

  # Compose document. yamlencode round-trips through HCL types, so the
  # diff in `tofu plan` shows the structured change rather than a raw
  # YAML blob.
  compose = {
    name = "iedora"

    networks = {
      iedora = {
        name   = "iedora"
        driver = "bridge"
      }
    }

    # No named volumes today. Postgres + OpenObserve data live on bind
    # mounts (see local.postgres_data + openobserve_data). Add a volume
    # here only if a new service truly needs Docker-managed storage.
    volumes = {}

    services = {
      # ── postgres ────────────────────────────────────────────────
      postgres = {
        image          = "postgres:18.4-alpine"
        container_name = "infra-postgres"
        restart        = "unless-stopped"
        networks       = { iedora = { aliases = ["postgres", "infra-postgres"] } }
        environment = {
          POSTGRES_USER     = "postgres"
          POSTGRES_PASSWORD = random_password.postgres.result
          POSTGRES_DB       = "postgres"
        }
        volumes = [
          "${local.postgres_data}:/var/lib/postgresql",
          "${local.iedora_etc_dir}/postgres-init/init.sql:/docker-entrypoint-initdb.d/init.sql:ro",
        ]
        healthcheck = {
          test     = ["CMD-SHELL", "pg_isready -U postgres"]
          interval = "5s"
          timeout  = "5s"
          retries  = 5
        }
        logging = { driver = "json-file", options = { max-size = "10m" } }
      }

      # ── openobserve ─────────────────────────────────────────────
      openobserve = {
        image          = "public.ecr.aws/zinclabs/openobserve:v0.90.0"
        container_name = "infra-openobserve"
        restart        = "unless-stopped"
        networks       = { iedora = { aliases = ["openobserve", "infra-openobserve"] } }
        environment = {
          ZO_DATA_DIR                    = "/data"
          ZO_HTTP_PORT                   = "5080"
          ZO_GRPC_PORT                   = "5081"
          ZO_S3_PROVIDER                 = "aws"
          ZO_S3_REGION_NAME              = "auto"
          ZO_S3_BUCKET_NAME              = cloudflare_r2_bucket.data.name
          ZO_S3_BUCKET_PREFIX            = "o2"
          ZO_S3_SERVER_URL               = "https://${var.account_id}.r2.cloudflarestorage.com"
          ZO_S3_FEATURE_FORCE_PATH_STYLE = "true"
          ZO_S3_ACCESS_KEY               = cloudflare_api_token.data_r2.id
          ZO_S3_SECRET_KEY               = sha256(cloudflare_api_token.data_r2.value)
          ZO_ROOT_USER_EMAIL             = var.infra_openobserve_root_user_email
          ZO_ROOT_USER_PASSWORD          = random_password.openobserve_password.result
        }
        volumes = ["${local.openobserve_data}:/data"]
        ports   = ["127.0.0.1:5080:5080"]
        logging = { driver = "json-file", options = { max-size = "10m" } }
      }

      # ── cloudflared (Zero Trust Tunnel connector) ───────────────
      # Outbound persistent connection to CF edge. Routes for every
      # public hostname are declared in tunnel.tf — this container
      # just consumes the connector token and runs the daemon.
      # No exposed ports, no on-box TLS, no LE.
      cloudflared = {
        image          = "cloudflare/cloudflared:latest"
        container_name = "infra-cloudflared"
        restart        = "unless-stopped"
        command        = ["tunnel", "--no-autoupdate", "run"]
        networks       = { iedora = { aliases = ["infra-cloudflared"] } }
        environment = {
          TUNNEL_TOKEN = data.cloudflare_zero_trust_tunnel_cloudflared_token.iedora.token
        }
        logging = { driver = "json-file", options = { max-size = "10m" } }
      }

      # ── infra-pg-backup ─────────────────────────────────────────
      infra-pg-backup = {
        image          = "ghcr.io/${var.github_owner}/infra-pg-backup:18"
        container_name = "infra-pg-backup"
        restart        = "unless-stopped"
        networks       = { iedora = {} }
        environment = {
          SCHEDULE             = "@daily"
          BACKUP_KEEP_DAYS     = "14"
          S3_REGION            = "auto"
          S3_ENDPOINT          = "https://${var.account_id}.r2.cloudflarestorage.com"
          S3_BUCKET            = cloudflare_r2_bucket.data.name
          S3_PREFIX            = "pg"
          POSTGRES_HOST        = "infra-postgres"
          POSTGRES_DATABASE    = ""
          POSTGRES_USER        = "postgres"
          POSTGRES_PASSWORD    = random_password.postgres.result
          S3_ACCESS_KEY_ID     = cloudflare_api_token.data_r2.id
          S3_SECRET_ACCESS_KEY = sha256(cloudflare_api_token.data_r2.value)
          PASSPHRASE           = random_password.backup_passphrase.result
        }
        logging = { driver = "json-file", options = { max-size = "10m" } }
      }
    }
  }

  compose_yaml = yamlencode(local.compose)
}
