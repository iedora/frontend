/**
 * Iedora access-control taxonomy — the single source of truth for what
 * each role can do across every product in the estate.
 *
 * Shape comes from better-auth's `createAccessControl` primitive: a
 * `statement` declares the resources + the actions each resource exposes,
 * then roles are bound to subsets of those (resource, action) pairs.
 *
 * Two axes:
 *   - PER-ORG roles (`member`, `admin`, `owner`) — scoped to one
 *     organization; reset for every org the user joins. Resolved by
 *     better-auth's `organization` plugin on every request that carries
 *     an active-organization context.
 *   - CROSS-TENANT role (`iedoraAdmin`) — global staff access; granted
 *     directly on the user row (NOT via membership) so a single grant
 *     covers every product + every tenant.
 *
 * Framework-free. Imported from server use-cases, route handlers, tests,
 * and the better-auth instance configuration. MUST NOT depend on
 * `server-only`, `next`, or any DB client.
 */

import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc, memberAc, ownerAc } from 'better-auth/plugins/organization/access'

/**
 * Resource → actions taxonomy. Extend by adding either a new key (new
 * resource) or a new entry to an existing array (new action).
 *
 * Naming:
 *   - Resources are camelCase plural nouns (`qrCodes`, `restaurants`).
 *   - Actions are imperative verbs (`read`, `write`, `update`, `delete`,
 *     `publish`, `manage`).
 *
 * The `...defaultStatements` spread pulls in the resources better-auth's
 * organization plugin defines itself (`organization`, `member`,
 * `invitation`, `team`) — keeping our taxonomy union-typed with the
 * library's so role definitions can extend the built-in roles instead of
 * re-defining org/member/invitation permissions from scratch.
 */
export const statement = {
  ...defaultStatements,
  qrCodes: ['read', 'write', 'update', 'delete'],
  analytics: ['read'],
  billing: ['read', 'manage'],
  restaurants: ['read', 'create', 'update', 'delete'],
  menus: ['read', 'write', 'publish'],
} as const

/**
 * The configured access-control instance. Passed to better-auth's
 * `organization` and `admin` plugins so role checks resolve against the
 * same taxonomy everywhere.
 */
export const ac = createAccessControl(statement)

/**
 * Per-org role: `member`. Default for any user invited into an org.
 *
 * Inherits org/member/invitation visibility from better-auth's `memberAc`,
 * then adds iedora-specific read-only access to the restaurant + menu
 * surfaces so a regular member can browse the org's data without being
 * able to mutate it.
 */
export const member = ac.newRole({
  ...memberAc.statements,
  restaurants: ['read'],
  menus: ['read'],
})

/**
 * Per-org role: `admin`. Day-to-day operator — can shape menus, manage
 * QR codes, see analytics. Cannot delete the org or invoice ledger
 * (those stay on `owner`).
 */
export const admin = ac.newRole({
  ...adminAc.statements,
  restaurants: ['read', 'create', 'update'],
  menus: ['read', 'write', 'publish'],
  qrCodes: ['read', 'write', 'update', 'delete'],
  analytics: ['read'],
  billing: ['read'],
})

/**
 * Per-org role: `owner`. Full control over the organization — every
 * action on every resource, including destructive ones (delete
 * restaurants, manage billing, remove members).
 */
export const owner = ac.newRole({
  ...ownerAc.statements,
  restaurants: ['read', 'create', 'update', 'delete'],
  menus: ['read', 'write', 'publish'],
  qrCodes: ['read', 'write', 'update', 'delete'],
  analytics: ['read'],
  billing: ['read', 'manage'],
})

/**
 * Cross-tenant role: `iedoraAdmin`. The wildcard. Granted directly on
 * the user (via the better-auth `admin` plugin's user-level role field —
 * NOT through org membership), so a single grant transcends every org.
 *
 * Resolves to every (resource, action) pair declared in `statement`. New
 * actions added to the taxonomy automatically land here — design new
 * actions accordingly (introduce a narrower role if a capability should
 * NOT default-on for staff).
 */
export const iedoraAdmin = ac.newRole({
  ...ownerAc.statements,
  restaurants: ['read', 'create', 'update', 'delete'],
  menus: ['read', 'write', 'publish'],
  qrCodes: ['read', 'write', 'update', 'delete'],
  analytics: ['read'],
  billing: ['read', 'manage'],
})

/**
 * The bound role registry passed to better-auth. Keys are the role
 * identifiers the library stores on `member.role` / `user.role`.
 */
export const roles = { member, admin, owner } as const
export type RoleKey = keyof typeof roles

/**
 * Statement type alias — useful for typing `hasPermission` calls.
 */
export type Statement = typeof statement
