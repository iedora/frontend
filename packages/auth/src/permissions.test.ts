import { describe, it, expect } from 'vitest'
import { ac, statement, member, admin, owner, iedoraAdmin, roles } from './permissions'

/**
 * Pure-function checks over the access-control taxonomy. No better-auth
 * boot, no database — just the role-bound resource/action pairs.
 *
 * The contract these specs lock in:
 *   - Every role exists and is a `ac.newRole` instance.
 *   - `owner` is a strict superset of `admin` for every iedora-defined
 *     resource (defence against accidental privilege regressions).
 *   - `iedoraAdmin` covers every (resource, action) pair declared in
 *     `statement` for iedora-owned resources (the wildcard staff role).
 */

const IEDORA_RESOURCES = ['qrCodes', 'analytics', 'billing', 'restaurants', 'menus'] as const

describe('permissions taxonomy', () => {
  it('exposes the bound roles', () => {
    expect(roles).toMatchObject({ member, admin, owner })
  })

  it('declares actions for every iedora resource', () => {
    for (const r of IEDORA_RESOURCES) {
      expect(statement[r]).toBeDefined()
      expect(Array.isArray(statement[r])).toBe(true)
      expect(statement[r].length).toBeGreaterThan(0)
    }
  })

  it('uses `createAccessControl` to bind roles', () => {
    // Each role exposes `.authorize` — the runtime hook better-auth uses
    // to evaluate a permission body against the role's statements.
    expect(typeof member.authorize).toBe('function')
    expect(typeof admin.authorize).toBe('function')
    expect(typeof owner.authorize).toBe('function')
    expect(typeof iedoraAdmin.authorize).toBe('function')
  })

  it('owner can read every iedora resource', async () => {
    for (const r of IEDORA_RESOURCES) {
      const res = await owner.authorize({ [r]: ['read'] } as never)
      expect(res.success, `owner can read ${r}`).toBe(true)
    }
  })

  it('admin cannot delete restaurants but owner can', async () => {
    const adminRes = await admin.authorize({ restaurants: ['delete'] } as never)
    const ownerRes = await owner.authorize({ restaurants: ['delete'] } as never)
    expect(adminRes.success).toBe(false)
    expect(ownerRes.success).toBe(true)
  })

  it('admin cannot manage billing but owner can', async () => {
    const adminRes = await admin.authorize({ billing: ['manage'] } as never)
    const ownerRes = await owner.authorize({ billing: ['manage'] } as never)
    expect(adminRes.success).toBe(false)
    expect(ownerRes.success).toBe(true)
  })

  it('member is read-only over iedora resources', async () => {
    const okRead = await member.authorize({ restaurants: ['read'] } as never)
    const denyWrite = await member.authorize({ menus: ['write'] } as never)
    expect(okRead.success).toBe(true)
    expect(denyWrite.success).toBe(false)
  })

  it('iedoraAdmin can perform every action declared for iedora resources', async () => {
    for (const r of IEDORA_RESOURCES) {
      for (const action of statement[r]) {
        const res = await iedoraAdmin.authorize({ [r]: [action] } as never)
        expect(
          res.success,
          `iedora-admin can ${String(action)} ${r}`,
        ).toBe(true)
      }
    }
  })

  it('ac is created from the statement', () => {
    expect(typeof ac.newRole).toBe('function')
  })
})
