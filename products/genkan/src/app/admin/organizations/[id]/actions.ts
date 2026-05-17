'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/features/admin'
import { auth } from '@/features/auth/adapters/better-auth-instance'
import { db } from '@/shared/db/client'
import { invitation, organization, session } from '@/shared/db/schema'

type Result = { ok: true } | { ok: false; error: string }

function toMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const obj = e as { message?: unknown; body?: { message?: unknown } }
    if (typeof obj.message === 'string') return obj.message
    if (obj.body && typeof obj.body.message === 'string') return obj.body.message
  }
  return fallback
}

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/

export async function updateOrganizationAction(
  organizationId: string,
  formData: FormData,
): Promise<Result> {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase()
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: 'Name must be 2–80 characters.' }
  }
  if (!slugRegex.test(slug)) {
    return {
      ok: false,
      error: 'Slug must be 2–40 lowercase letters / numbers / hyphens.',
    }
  }

  // Better Auth's updateOrganization requires the caller to be a member of
  // the org. Platform admins generally aren't, so we update the row directly
  // through Drizzle for these two columns. Membership/role mutations still
  // go through the plugin so its invariants run.
  try {
    await db
      .update(organization)
      .set({ name, slug })
      .where(eq(organization.id, organizationId))
  } catch (e) {
    return {
      ok: false,
      error: toMessage(e, 'Could not update organization.'),
    }
  }
  revalidatePath(`/admin/organizations/${organizationId}`)
  revalidatePath('/admin/organizations')
  return { ok: true }
}

export async function inviteMemberAction(
  organizationId: string,
  formData: FormData,
): Promise<Result> {
  await requireAdmin()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = String(formData.get('role') ?? '').trim() || 'member'
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  try {
    await auth.api.createInvitation({
      headers: await headers(),
      body: {
        email,
        // Cast: Better Auth narrows the role to its plugin's union of known
        // roles. We accept any string from the form so admin operators can
        // assign custom roles defined elsewhere.
        role: role as 'member' | 'admin' | 'owner',
        organizationId,
      },
    })
  } catch (e) {
    return {
      ok: false,
      error: toMessage(e, 'Could not send invitation.'),
    }
  }
  revalidatePath(`/admin/organizations/${organizationId}`)
  return { ok: true }
}

export async function removeMemberAction(
  organizationId: string,
  memberIdOrEmail: string,
): Promise<Result> {
  await requireAdmin()
  try {
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail, organizationId },
    })
  } catch (e) {
    return { ok: false, error: toMessage(e, 'Could not remove member.') }
  }
  revalidatePath(`/admin/organizations/${organizationId}`)
  return { ok: true }
}

export async function cancelInvitationAction(
  organizationId: string,
  invitationId: string,
): Promise<Result> {
  await requireAdmin()
  try {
    await db.delete(invitation).where(eq(invitation.id, invitationId))
  } catch (e) {
    return { ok: false, error: toMessage(e, 'Could not cancel invitation.') }
  }
  revalidatePath(`/admin/organizations/${organizationId}`)
  return { ok: true }
}

export async function deleteOrganizationAction(
  organizationId: string,
): Promise<Result> {
  await requireAdmin()
  try {
    // CASCADE on member / invitation drops dependents. session.activeOrgId
    // has no FK, so we null it out for sessions pointing at this org.
    await db
      .update(session)
      .set({ activeOrganizationId: null })
      .where(eq(session.activeOrganizationId, organizationId))
    await db.delete(organization).where(eq(organization.id, organizationId))
  } catch (e) {
    return {
      ok: false,
      error: toMessage(e, 'Could not delete organization.'),
    }
  }
  revalidatePath('/admin/organizations')
  redirect('/admin/organizations')
}
