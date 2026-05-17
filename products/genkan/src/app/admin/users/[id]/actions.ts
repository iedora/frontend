'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/features/admin'
import { auth } from '@/features/auth/adapters/better-auth-instance'

type Result = { ok: true } | { ok: false; error: string }

function toMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const obj = e as { message?: unknown; body?: { message?: unknown } }
    if (typeof obj.message === 'string') return obj.message
    if (obj.body && typeof obj.body.message === 'string') return obj.body.message
  }
  return fallback
}

/**
 * Mutations for /admin/users/[id]. Every action: requireAdmin() → call
 * Better Auth's `auth.api.*` so the plugin's invariants (role validation,
 * session invalidation on ban, etc.) run → revalidate the page.
 */

export async function setRoleAction(
  userId: string,
  formData: FormData,
): Promise<Result> {
  await requireAdmin()
  const role = String(formData.get('role') ?? '').trim() || 'user'
  try {
    await auth.api.setRole({
      headers: await headers(),
      // Better Auth narrows the role to its known string-union; accept any
      // text from the form so platform admins can introduce custom roles.
      body: { userId, role: role as 'user' | 'admin' },
    })
  } catch (e) {
    return { ok: false, error: toMessage(e, 'Could not set role.') }
  }
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { ok: true }
}

export async function banAction(
  userId: string,
  formData: FormData,
): Promise<Result> {
  await requireAdmin()
  const banReason = String(formData.get('banReason') ?? '').trim()
  const banExpiresInDays = Number(formData.get('banExpiresInDays') ?? '')
  const banExpiresIn =
    Number.isFinite(banExpiresInDays) && banExpiresInDays > 0
      ? Math.floor(banExpiresInDays * 86_400)
      : undefined
  try {
    await auth.api.banUser({
      headers: await headers(),
      body: {
        userId,
        banReason: banReason || undefined,
        banExpiresIn,
      },
    })
  } catch (e) {
    return { ok: false, error: toMessage(e, 'Could not ban user.') }
  }
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { ok: true }
}

export async function unbanAction(userId: string): Promise<Result> {
  await requireAdmin()
  try {
    await auth.api.unbanUser({
      headers: await headers(),
      body: { userId },
    })
  } catch (e) {
    return { ok: false, error: toMessage(e, 'Could not unban user.') }
  }
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/users')
  return { ok: true }
}

export async function impersonateAction(userId: string) {
  await requireAdmin()
  try {
    await auth.api.impersonateUser({
      headers: await headers(),
      body: { userId },
    })
  } catch (e) {
    return {
      ok: false as const,
      error: toMessage(e, 'Could not impersonate user.'),
    }
  }
  redirect('/')
}

export async function revokeSessionAction(
  userId: string,
  sessionToken: string,
): Promise<Result> {
  await requireAdmin()
  try {
    await auth.api.revokeUserSession({
      headers: await headers(),
      body: { sessionToken },
    })
  } catch (e) {
    return {
      ok: false,
      error: toMessage(e, 'Could not revoke session.'),
    }
  }
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath('/admin/sessions')
  return { ok: true }
}

export async function deleteUserAction(userId: string): Promise<Result> {
  await requireAdmin()
  try {
    await auth.api.removeUser({
      headers: await headers(),
      body: { userId },
    })
  } catch (e) {
    return { ok: false, error: toMessage(e, 'Could not delete user.') }
  }
  revalidatePath('/admin/users')
  redirect('/admin/users')
}
