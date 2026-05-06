import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { category, item, menu, restaurant, type RestaurantTheme } from '@/lib/db/schema'
import { resolveTheme, type ResolvedTheme } from '@/lib/menu-themes'
import { MenuRenderer } from '@/components/menu/menu-renderer'
import type { PublicMenu, PublicMenuData } from '@/components/menu/types'

async function loadPublishedRestaurant(
  slug: string,
): Promise<(PublicMenuData & { theme: ResolvedTheme }) | null> {
  const restaurantRows = await db
    .select({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      description: restaurant.description,
      logoUrl: restaurant.logoUrl,
      bannerUrl: restaurant.bannerUrl,
      theme: restaurant.theme,
      published: restaurant.published,
    })
    .from(restaurant)
    .where(eq(restaurant.slug, slug))
    .limit(1)

  const r = restaurantRows[0]
  if (!r || !r.published) return null

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
    theme: resolveTheme(r.theme as RestaurantTheme | null),
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await loadPublishedRestaurant(slug)
  if (!data) return { title: 'Menu not found' }
  return {
    title: `${data.restaurant.name} · Menu`,
    description:
      data.restaurant.description ?? `Digital menu for ${data.restaurant.name}.`,
  }
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await loadPublishedRestaurant(slug)
  if (!data) notFound()
  return <MenuRenderer {...data} />
}
