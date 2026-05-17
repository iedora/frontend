'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/features/admin'
import { db } from '@/shared/db/client'
import { oauthClient } from '@/shared/db/schema'

type Result = { ok: true } | { ok: false; error: string }

function toMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const obj = e as { message?: unknown }
    if (typeof obj.message === 'string') return obj.message
  }
  return fallback
}

function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export async function updateApplicationAction(
  internalId: string,
  formData: FormData,
): Promise<Result> {
  await requireAdmin()
  const name = String(formData.get('client_name') ?? '').trim()
  const redirectUris = splitLines(
    String(formData.get('redirect_uris') ?? ''),
  )
  const scopes = formData
    .getAll('scope')
    .map((s) => String(s))
    .filter(Boolean)

  if (!name) return { ok: false, error: 'Name is required.' }
  if (redirectUris.length === 0) {
    return { ok: false, error: 'At least one redirect URI is required.' }
  }
  for (const uri of redirectUris) {
    try {
      const u = new URL(uri)
      if (!u.protocol.startsWith('http')) {
        return { ok: false, error: `Invalid redirect URI: ${uri}` }
      }
    } catch {
      return { ok: false, error: `Invalid redirect URI: ${uri}` }
    }
  }

  try {
    await db
      .update(oauthClient)
      .set({
        name,
        redirectUris,
        scopes: scopes.length > 0 ? scopes : null,
        updatedAt: new Date(),
      })
      .where(eq(oauthClient.id, internalId))
  } catch (e) {
    return {
      ok: false,
      error: toMessage(e, 'Could not update application.'),
    }
  }
  revalidatePath(`/admin/applications/${internalId}`)
  revalidatePath('/admin/applications')
  return { ok: true }
}
