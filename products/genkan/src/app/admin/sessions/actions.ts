'use server'

import { headers } from 'next/headers'
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

export async function revokeAnySessionAction(
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
  revalidatePath('/admin/sessions')
  return { ok: true }
}
