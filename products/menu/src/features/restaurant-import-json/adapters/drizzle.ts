import 'server-only'
import { db } from '../../../shared/db/client'
import { category, item, menu, restaurant } from '../../../shared/db/schema'
import type { RestaurantImportPort } from '../ports'

function makeDrizzleRestaurantImport(): RestaurantImportPort {
  return {
    async importRestaurant({ tenantId, slug, data }) {
      return await db.transaction(async (tx) => {
        const [r] = await tx
          .insert(restaurant)
          .values({
            tenantId,
            name: data.restaurant.name,
            slug,
            description: data.restaurant.description,
            descriptionI18n: data.restaurant.descriptionI18n,
            logoUrl: data.restaurant.logoUrl,
            bannerUrl: data.restaurant.bannerUrl,
            defaultLanguage: data.restaurant.defaultLanguage,
            supportedLanguages: data.restaurant.supportedLanguages,
            theme: data.restaurant.theme,
          })
          .returning({ id: restaurant.id })
        if (!r) throw new Error('restaurant insert returned no rows')

        const [m] = await tx
          .insert(menu)
          .values({
            restaurantId: r.id,
            name: data.menu.name,
            nameI18n: data.menu.nameI18n,
            description: data.menu.description,
            descriptionI18n: data.menu.descriptionI18n,
            position: 0,
            active: true,
          })
          .returning({ id: menu.id })
        if (!m) throw new Error('menu insert returned no rows')

        for (const [catIdx, cat] of data.menu.categories.entries()) {
          const [c] = await tx
            .insert(category)
            .values({
              menuId: m.id,
              restaurantId: r.id,
              name: cat.name,
              nameI18n: cat.nameI18n,
              description: cat.description,
              descriptionI18n: cat.descriptionI18n,
              position: catIdx * 10,
            })
            .returning({ id: category.id })
          if (!c) throw new Error('category insert returned no rows')

          if (cat.items.length === 0) continue
          await tx.insert(item).values(
            cat.items.map((it, itemIdx) => ({
              categoryId: c.id,
              restaurantId: r.id,
              name: it.name,
              nameI18n: it.nameI18n,
              description: it.description,
              descriptionI18n: it.descriptionI18n,
              priceCents: it.priceCents,
              currency: it.currency ?? 'EUR',
              imageUrl: it.imageUrl,
              available: it.available ?? true,
              tags: it.tags ?? [],
              variants:
                it.variants && it.variants.length > 0 ? it.variants : null,
              position: itemIdx * 10,
            })),
          )
        }

        return { restaurantId: r.id, menuId: m.id }
      })
    },
  }
}

export const drizzleRestaurantImport = makeDrizzleRestaurantImport()
