import { text, timestamp, boolean, integer, pgSchema } from 'drizzle-orm/pg-core'

/**
 * Drizzle schema for the iedora auth surface.
 *
 * Lives in the `core` Postgres database, under the `core` schema, on the
 * SHARED Postgres instance. `core` is the namespace owned by the (future)
 * core product — auth tables today, audit + admin tables tomorrow.
 *
 * Tables match the shape better-auth expects (the library generates SQL
 * with these exact column names when you run its CLI; we maintain the
 * schema by hand here so we own migrations and the type surface stays
 * in one place).
 *
 * Tables:
 *   - `user`         — identity row. `role` is the cross-tenant scalar
 *                       (null for tenants, `iedora-admin` for staff).
 *   - `session`      — opaque token + activeOrganizationId pointer.
 *   - `account`      — provider linkage. With email+password only, a row
 *                       per user with `providerId='credential'`.
 *   - `verification` — short-lived OTPs / email-change tokens.
 *   - `organization` — the tenant entity. Menu's `restaurants` row joins
 *                       to this via `organizationId`.
 *   - `member`       — (user, organization, role) join. `role` is one of
 *                       `owner` / `admin` / `member`.
 *   - `invitation`   — pending email invites with TTL.
 *
 * All columns use snake_case at the database layer (Drizzle's
 * `casing: 'snake_case'` config in `drizzle.config.ts`).
 */

export const coreSchema = pgSchema('core')

export const user = coreSchema.table('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  /**
   * Cross-tenant role granted directly on the user. `null` for normal
   * tenants; `'iedora-admin'` for staff. Resolved by better-auth's
   * `admin` plugin to back `requireIedoraAdmin` / `requireScope`.
   */
  role: text('role'),
  /** Set by the `admin` plugin when an account is banned. */
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = coreSchema.table('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /**
   * Set by the `organization` plugin. Points at the org the user is
   * currently acting on. Authorisation checks resolve role + permission
   * against the corresponding `member` row.
   */
  activeOrganizationId: text('active_organization_id'),
  /** Set by `admin` plugin during impersonation. */
  impersonatedBy: text('impersonated_by'),
})

export const account = coreSchema.table('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = coreSchema.table('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const organization = coreSchema.table('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  /** Free-form JSON metadata (e.g. plan code, billing flags). */
  metadata: text('metadata'),
})

export const member = coreSchema.table('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /**
   * Role within the organization. One of the keys exported from
   * `./permissions.ts` (`owner` / `admin` / `member`). Stored as raw
   * text so a renamed role doesn't blow up reads — better-auth coerces
   * unknown roles to `member` defensively.
   */
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const invitation = coreSchema.table('invitation', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role'),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
})

/**
 * Rate-limit table. Used by better-auth's built-in rate limiter when
 * `storage: 'database'` is configured — survives process restarts and
 * works across multiple Next.js instances behind the same Postgres.
 */
export const rateLimit = coreSchema.table('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key'),
  count: integer('count'),
  lastRequest: timestamp('last_request'),
})

export const schema = {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  rateLimit,
}
