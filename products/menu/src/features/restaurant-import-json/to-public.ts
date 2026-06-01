/**
 * Adapter: parsed JSON import payload → `RenderProps` shape that the
 * public menu templates consume. Lets the admin IDE preview render the
 * exact same `<MenuRenderer>` the public page will show after persistence.
 *
 * Client-safe — no DB, no `server-only`. Pure transform.
 *
 * IDs are stubbed (in-memory only — the renderer just needs them as React
 * keys); timestamps / positions / restaurantId aren't on the public render
 * shape so they don't need to be faked.
 */

import { localized, localizedNullable, type LanguageCode } from '../i18n'
import { resolveTheme, type ResolvedTheme } from '../menu-publishing/rsc/theme'
import type { PublicMenuLoaded } from '../menu-publishing/rsc/public-menu-view-ui'
import type {
  PublicCategory,
  PublicItem,
  PublicMenu,
  PublicRestaurant,
  PublicVariant,
} from '../menu-publishing/rsc/types'
import type { RestaurantImport } from './schema'

function variantToPublic(
  v: {
    label: string
    labelI18n?: Partial<Record<LanguageCode, string>>
    priceCents: number
  },
  lang: LanguageCode,
  defaultLang: LanguageCode,
): PublicVariant {
  return {
    label: localized(v.label, v.labelI18n, lang, defaultLang),
    priceCents: v.priceCents,
  }
}

export function importToPublicMenuLoaded(
  data: RestaurantImport,
  currentLanguage: LanguageCode,
): PublicMenuLoaded {
  const defaultLang = data.restaurant.defaultLanguage
  const theme: ResolvedTheme = resolveTheme(data.restaurant.theme)

  const restaurant: PublicRestaurant = {
    id: 'preview-restaurant',
    name: data.restaurant.name,
    slug: 'preview',
    description: localizedNullable(
      data.restaurant.description ?? null,
      data.restaurant.descriptionI18n,
      currentLanguage,
      defaultLang,
    ),
    logoUrl: data.restaurant.logoUrl ?? null,
    bannerUrl: data.restaurant.bannerUrl ?? null,
  }

  const items = (catIdx: number) =>
    (it: RestaurantImport['menu']['categories'][number]['items'][number], i: number): PublicItem => ({
      id: `preview-i-${catIdx}-${i}`,
      name: localized(it.name, it.nameI18n, currentLanguage, defaultLang),
      description: localizedNullable(
        it.description ?? null,
        it.descriptionI18n,
        currentLanguage,
        defaultLang,
      ),
      priceCents: it.priceCents,
      currency: it.currency ?? 'EUR',
      available: it.available ?? true,
      tags: it.tags ?? [],
      imageUrl: it.imageUrl ?? null,
      variants: (it.variants ?? []).map((v) => variantToPublic(v, currentLanguage, defaultLang)),
    })

  const categories: PublicCategory[] = data.menu.categories.map((cat, ci) => ({
    id: `preview-c-${ci}`,
    name: localized(cat.name, cat.nameI18n, currentLanguage, defaultLang),
    description: localizedNullable(
      cat.description ?? null,
      cat.descriptionI18n,
      currentLanguage,
      defaultLang,
    ),
    items: cat.items.map(items(ci)),
  }))

  const menu: PublicMenu = {
    id: 'preview-menu',
    name: localized(data.menu.name, data.menu.nameI18n, currentLanguage, defaultLang),
    description: localizedNullable(
      data.menu.description ?? null,
      data.menu.descriptionI18n,
      currentLanguage,
      defaultLang,
    ),
    categories,
  }

  return {
    restaurant,
    menus: [menu],
    theme,
    tenantId: 'preview-tenant',
    defaultLanguage: defaultLang,
    supportedLanguages: [...data.restaurant.supportedLanguages],
    currentLanguage,
  }
}
