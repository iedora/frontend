import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

/**
 * Lazy-initialised Postgres pool against the `core` database.
 *
 * The connection is built at first call, NOT at module import, so:
 *   - Static analysis (`next build` collecting page data with an empty
 *     env) doesn't open a socket.
 *   - Tests can monkey-patch the env before any auth import resolves.
 *
 * Singleton per Node process — `postgres-js` already pools connections;
 * we only need one Drizzle handle, shared by every call into the auth
 * surface.
 */
let cached: ReturnType<typeof build> | null = null

function build() {
  const url = process.env.CORE_DATABASE_URL
  if (!url) {
    throw new Error(
      '[iedora/auth] CORE_DATABASE_URL is not set. ' +
        'Every consumer must export it (Postgres URL pointing at the ' +
        '`core` database).',
    )
  }
  const client = postgres(url, {
    // Conservative pool size — the core DB serves cookie validation per
    // request, not bulk queries. The shared Postgres instance is also
    // serving the menu schema; over-allocating here starves the menu.
    max: 10,
    prepare: false,
  })
  return drizzle(client, { schema, casing: 'snake_case' })
}

export function getCoreDb() {
  if (!cached) cached = build()
  return cached
}
