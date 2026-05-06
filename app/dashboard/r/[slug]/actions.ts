'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, max } from 'drizzle-orm'
import { z } from 'zod'
import { requireRestaurantBySlug } from '@/lib/dal'
import { db } from '@/lib/db'
import { category, item, menu, restaurant } from '@/lib/db/schema'

// Realistic-ish bistro menu used as the seed payload. Editing this is the
// single place to tune what users see when they click "Sample menu".
const SAMPLE_MENU: ReadonlyArray<{
  category: string
  items: ReadonlyArray<{
    name: string
    description: string
    priceCents: number
  }>
}> = [
  {
    category: 'Starters',
    items: [
      { name: 'Bruschetta', description: 'Tomato, basil, olive oil', priceCents: 650 },
      { name: 'Calamari', description: 'Lemon mayo, fennel salad', priceCents: 800 },
      { name: 'Burrata', description: 'Marinated tomatoes, sourdough', priceCents: 950 },
    ],
  },
  {
    category: 'Mains',
    items: [
      {
        name: 'Spaghetti Carbonara',
        description: 'Guanciale, pecorino, black pepper',
        priceCents: 1400,
      },
      {
        name: 'Risotto Funghi',
        description: 'Porcini, truffle oil',
        priceCents: 1550,
      },
      {
        name: 'Steak frites',
        description: 'House cut, peppercorn jus',
        priceCents: 1900,
      },
    ],
  },
  {
    category: 'Desserts',
    items: [
      { name: 'Tiramisu', description: 'Espresso, mascarpone', priceCents: 700 },
      { name: 'Panna cotta', description: 'Berries, vanilla', priceCents: 650 },
    ],
  },
]

const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export async function createMenu(slug: string, formData: FormData) {
  const parsed = createMenuSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid name' }
  }

  const { restaurant: r } = await requireRestaurantBySlug(slug)

  const [{ next }] = await db
    .select({ next: max(menu.position) })
    .from(menu)
    .where(eq(menu.restaurantId, r.id))

  await db.insert(menu).values({
    restaurantId: r.id,
    name: parsed.data.name,
    position: (next ?? -1) + 1,
  })

  revalidatePath(`/dashboard/r/${slug}`)
  revalidatePath(`/r/${slug}`)
  return { ok: true as const }
}

export async function deleteMenu(slug: string, menuId: string) {
  const { restaurant: r } = await requireRestaurantBySlug(slug)
  await db.delete(menu).where(and(eq(menu.id, menuId), eq(menu.restaurantId, r.id)))
  revalidatePath(`/dashboard/r/${slug}`)
  revalidatePath(`/r/${slug}`)
}

export async function seedSampleMenu(slug: string) {
  const { restaurant: r } = await requireRestaurantBySlug(slug)

  // Append after any existing menus so we never reuse a position. The whole
  // seed runs in a transaction so a half-created menu can't leak if anything
  // along the way fails.
  const [{ next: nextMenuPos }] = await db
    .select({ next: max(menu.position) })
    .from(menu)
    .where(eq(menu.restaurantId, r.id))

  const newMenuId = await db.transaction(async (tx) => {
    const [insertedMenu] = await tx
      .insert(menu)
      .values({
        restaurantId: r.id,
        name: 'Sample menu',
        position: (nextMenuPos ?? -1) + 1,
      })
      .returning({ id: menu.id })

    for (const [catIdx, c] of SAMPLE_MENU.entries()) {
      const [insertedCategory] = await tx
        .insert(category)
        .values({
          menuId: insertedMenu.id,
          restaurantId: r.id,
          name: c.category,
          position: catIdx * 10,
        })
        .returning({ id: category.id })

      const itemRows = c.items.map((it, itemIdx) => ({
        categoryId: insertedCategory.id,
        restaurantId: r.id,
        name: it.name,
        description: it.description,
        priceCents: it.priceCents,
        currency: 'EUR',
        position: itemIdx * 10,
      }))
      if (itemRows.length > 0) await tx.insert(item).values(itemRows)
    }

    return insertedMenu.id
  })

  revalidatePath(`/dashboard/r/${slug}`)
  revalidatePath(`/r/${slug}`)
  return { ok: true as const, menuId: newMenuId }
}

export async function setRestaurantPublished(slug: string, published: boolean) {
  const { restaurant: r } = await requireRestaurantBySlug(slug)
  await db.update(restaurant).set({ published }).where(eq(restaurant.id, r.id))
  revalidatePath(`/dashboard/r/${slug}`)
  revalidatePath(`/r/${slug}`)
  return { ok: true as const, published }
}
