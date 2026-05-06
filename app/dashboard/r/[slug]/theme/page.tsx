import Link from 'next/link'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { requireRestaurantBySlug } from '@/lib/dal'
import { db } from '@/lib/db'
import { category, item, menu, restaurant, type RestaurantTheme } from '@/lib/db/schema'
import { resolveTheme } from '@/lib/menu-themes'
import type { PublicMenu, PublicMenuData } from '@/components/menu/types'
import { ThemeEditor } from './theme-editor'

async function loadEditorData(restaurantId: string): Promise<PublicMenuData & { rawTheme: RestaurantTheme | null }> {
  const rows = await db
    .select({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      logoUrl: restaurant.logoUrl,
      bannerUrl: restaurant.bannerUrl,
      theme: restaurant.theme,
    })
    .from(restaurant)
    .where(eq(restaurant.id, restaurantId))
    .limit(1)

  const r = rows[0]!

  const menus = await db
    .select()
    .from(menu)
    .where(and(eq(menu.restaurantId, r.id), eq(menu.active, true)))
    .orderBy(asc(menu.position))

  const categories =
    menus.length === 0
      ? []
      : await db
          .select()
          .from(category)
          .where(
            inArray(
              category.menuId,
              menus.map((m) => m.id),
            ),
          )
          .orderBy(asc(category.position))

  const items =
    categories.length === 0
      ? []
      : await db
          .select()
          .from(item)
          .where(
            inArray(
              item.categoryId,
              categories.map((c) => c.id),
            ),
          )
          .orderBy(asc(item.position))

  const itemsByCategory = new Map<string, PublicMenu['categories'][number]['items']>()
  for (const c of categories) itemsByCategory.set(c.id, [])
  for (const it of items) {
    itemsByCategory.get(it.categoryId)?.push({
      id: it.id,
      name: it.name,
      description: it.description,
      priceCents: it.priceCents,
      currency: it.currency,
      available: it.available,
      tags: it.tags ?? [],
      imageUrl: it.imageUrl,
    })
  }

  const categoriesByMenu = new Map<string, PublicMenu['categories']>()
  for (const m of menus) categoriesByMenu.set(m.id, [])
  for (const c of categories) {
    categoriesByMenu.get(c.menuId)?.push({
      id: c.id,
      name: c.name,
      description: c.description,
      items: itemsByCategory.get(c.id) ?? [],
    })
  }

  return {
    restaurant: {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      logoUrl: r.logoUrl,
      bannerUrl: r.bannerUrl,
    },
    menus: menus.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      categories: categoriesByMenu.get(m.id) ?? [],
    })),
    rawTheme: r.theme as RestaurantTheme | null,
  }
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { restaurant: r } = await requireRestaurantBySlug(slug)
  const data = await loadEditorData(r.id)
  const initialTheme = resolveTheme(data.rawTheme)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/r/${slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {r.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Edit the restaurant identity and visual theme. Changes are live in the
          preview; save each section to publish to /r/{slug}.
        </p>
      </div>

      <ThemeEditor
        slug={slug}
        restaurant={data.restaurant}
        menus={data.menus}
        initialTheme={initialTheme}
      />
    </div>
  )
}
