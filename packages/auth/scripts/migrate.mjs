// Applies the @iedora/auth Drizzle migrations against the `core`
// Postgres database in production. Runs inside the menu container
// (workspace dep — node_modules/@iedora/auth/ is laid down at build
// time) via:
//
//   node node_modules/@iedora/auth/scripts/migrate.mjs
//
// Database bootstrap is two-layered:
//   1. infra/iac/postgres/init.sql creates `core` on the very first
//      boot of the shared infra-postgres accessory. Fast path.
//   2. The CREATE-IF-NOT-EXISTS block below covers warm postgres
//      volumes where the DB was added later (no wipe needed).
//
// pg_advisory_lock guards against two replicas racing on `migrate()` —
// drizzle has no built-in migration lock (drizzle-orm#874). The lock
// literal "iedora-core-migrate" feeds the crc32 so the key stays
// stable across binary renames.

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const url = process.env.CORE_DATABASE_URL
if (!url) {
  console.error('CORE_DATABASE_URL is not set')
  process.exit(1)
}

const LOCK_KEY = 1296515955 // crc32 of "iedora-core-migrate"

function adminUrlFor(connStr) {
  const u = new URL(connStr)
  u.pathname = '/postgres'
  return u.toString()
}

function dbNameFromUrl(connStr) {
  const u = new URL(connStr)
  return decodeURIComponent(u.pathname.replace(/^\//, '')) || 'postgres'
}

// Ensure the target DB exists.
{
  const targetDb = dbNameFromUrl(url)
  const adminSql = postgres(adminUrlFor(url), { max: 1, onnotice: () => {} })
  try {
    const rows = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${targetDb}`
    if (rows.length === 0) {
      await adminSql.unsafe(`CREATE DATABASE "${targetDb.replace(/"/g, '""')}"`)
      console.log(`Created database "${targetDb}".`)
    }
  } finally {
    await adminSql.end()
  }
}

// drizzle/ folder lives at the package root (../drizzle relative to
// this script). __dirname-style resolution because ESM doesn't expose
// __dirname directly.
const here = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(here, '..', 'drizzle')

const sql = postgres(url, { max: 1 })
const db = drizzle(sql)

try {
  await sql`SELECT pg_advisory_lock(${LOCK_KEY})`
  await migrate(db, {
    migrationsFolder,
    migrationsTable: '__drizzle_migrations',
    migrationsSchema: 'core',
  })
  console.log('Migrations applied.')
} catch (err) {
  console.error('Migration failed:', err)
  process.exitCode = 1
} finally {
  try { await sql`SELECT pg_advisory_unlock(${LOCK_KEY})` } catch {}
  await sql.end()
}
