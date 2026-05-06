'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireRestaurantBySlug } from '@/lib/dal'
import { db } from '@/lib/db'
import { restaurant, type RestaurantTheme } from '@/lib/db/schema'
import { FONTS, HEX_PATTERN, LAYOUTS } from '@/lib/menu-themes'

const themeSchema = z.object({
  layout: z.enum(LAYOUTS.map((l) => l.id) as [string, ...string[]]),
  font: z.enum(FONTS.map((f) => f.id) as [string, ...string[]]),
  primaryColor: z.string().regex(HEX_PATTERN, 'Must be a #RRGGBB hex color'),
  secondaryColor: z.string().regex(HEX_PATTERN, 'Must be a #RRGGBB hex color'),
})

// Empty strings collapse to null on the server so the DB doesn't carry "" rows
// that the renderer would treat as truthy and try to render.
const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === '' ? null : v))

// Logo/banner are managed by the ImageUpload component (uploads commit
// directly via lib/upload/actions). This action only handles textual identity.
const identitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: optionalText,
})

type ActionResult = { ok: true } | { ok: false; error: string }

export async function updateTheme(
  slug: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = themeSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid theme',
    }
  }

  const { restaurant: r } = await requireRestaurantBySlug(slug)
  await db
    .update(restaurant)
    .set({ theme: parsed.data as RestaurantTheme })
    .where(eq(restaurant.id, r.id))

  revalidatePath(`/dashboard/r/${slug}/theme`)
  revalidatePath(`/r/${slug}`)
  return { ok: true }
}

export async function updateIdentity(
  slug: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = identitySchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const { restaurant: r } = await requireRestaurantBySlug(slug)
  await db
    .update(restaurant)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .where(eq(restaurant.id, r.id))

  revalidatePath(`/dashboard/r/${slug}`)
  revalidatePath(`/dashboard/r/${slug}/theme`)
  revalidatePath(`/r/${slug}`)
  return { ok: true }
}
