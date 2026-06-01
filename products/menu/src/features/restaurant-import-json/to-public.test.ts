import { describe, expect, it } from 'vitest'
import { restaurantImportSchema, type RestaurantImport } from './schema'
import { importToPublicMenuLoaded } from './to-public'

function fixture(overrides: Partial<RestaurantImport['restaurant']> = {}): RestaurantImport {
  return restaurantImportSchema.parse({
    user: { email: 'a@b.com', password: 'longenough' },
    tenant: { plan: 'free' },
    restaurant: {
      name: 'Trattoria',
      description: 'Italiana',
      descriptionI18n: { en: 'Italian' },
      defaultLanguage: 'pt',
      supportedLanguages: ['pt', 'en'],
      ...overrides,
    },
    menu: {
      name: 'Menu',
      nameI18n: { en: 'Main menu' },
      categories: [
        {
          name: 'Entradas',
          nameI18n: { en: 'Starters' },
          items: [
            {
              name: 'Bruschetta',
              nameI18n: { en: 'Bruschetta toast' },
              description: 'Pão',
              descriptionI18n: { en: 'Bread' },
              priceCents: 650,
              variants: [
                {
                  label: 'Pequena',
                  labelI18n: { en: 'Small' },
                  priceCents: 650,
                },
                {
                  label: 'Grande',
                  labelI18n: { en: 'Large' },
                  priceCents: 950,
                },
              ],
            },
          ],
        },
      ],
    },
  })
}

describe('importToPublicMenuLoaded · default language', () => {
  it('uses plain `name`/`description` when language === default', () => {
    const loaded = importToPublicMenuLoaded(fixture(), 'pt')
    expect(loaded.restaurant.description).toBe('Italiana')
    expect(loaded.menus[0]?.name).toBe('Menu')
    expect(loaded.menus[0]?.categories[0]?.name).toBe('Entradas')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.name).toBe('Bruschetta')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.description).toBe('Pão')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.variants[0]?.label).toBe(
      'Pequena',
    )
  })
})

describe('importToPublicMenuLoaded · non-default language', () => {
  it('reads from *I18n maps when available', () => {
    const loaded = importToPublicMenuLoaded(fixture(), 'en')
    expect(loaded.restaurant.description).toBe('Italian')
    expect(loaded.menus[0]?.name).toBe('Main menu')
    expect(loaded.menus[0]?.categories[0]?.name).toBe('Starters')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.name).toBe(
      'Bruschetta toast',
    )
    expect(loaded.menus[0]?.categories[0]?.items[0]?.description).toBe('Bread')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.variants[0]?.label).toBe(
      'Small',
    )
  })

  it('falls back to default-language plain text when translation missing', () => {
    const f = fixture()
    // Drop the EN override on the item name only.
    f.menu.categories[0]!.items[0]!.nameI18n = undefined
    const loaded = importToPublicMenuLoaded(f, 'en')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.name).toBe('Bruschetta')
    // Other EN fields still resolve.
    expect(loaded.menus[0]?.categories[0]?.items[0]?.description).toBe('Bread')
  })
})

describe('importToPublicMenuLoaded · shape', () => {
  it('always emits PublicVariant arrays (not undefined)', () => {
    const f = fixture()
    // Add an item without variants.
    f.menu.categories[0]!.items.push({
      name: 'Café',
      priceCents: 100,
    } as RestaurantImport['menu']['categories'][number]['items'][number])
    const loaded = importToPublicMenuLoaded(f, 'pt')
    expect(loaded.menus[0]?.categories[0]?.items[1]?.variants).toEqual([])
  })

  it('emits `null` (not undefined) for missing description/imageUrl/logoUrl', () => {
    const f = fixture({ description: undefined, descriptionI18n: undefined })
    const loaded = importToPublicMenuLoaded(f, 'pt')
    expect(loaded.restaurant.description).toBeNull()
    expect(loaded.restaurant.logoUrl).toBeNull()
    expect(loaded.restaurant.bannerUrl).toBeNull()
  })

  it('defaults item.currency to EUR and available to true', () => {
    const loaded = importToPublicMenuLoaded(fixture(), 'pt')
    const it = loaded.menus[0]?.categories[0]?.items[0]
    expect(it?.currency).toBe('EUR')
    expect(it?.available).toBe(true)
  })

  it('uses preview ids that are stable for keys', () => {
    const loaded = importToPublicMenuLoaded(fixture(), 'pt')
    expect(loaded.restaurant.id).toBe('preview-restaurant')
    expect(loaded.menus[0]?.id).toBe('preview-menu')
    expect(loaded.menus[0]?.categories[0]?.id).toBe('preview-c-0')
    expect(loaded.menus[0]?.categories[0]?.items[0]?.id).toBe('preview-i-0-0')
  })

  it('carries over supportedLanguages + currentLanguage for the switcher', () => {
    const loaded = importToPublicMenuLoaded(fixture(), 'en')
    expect(loaded.supportedLanguages).toEqual(['pt', 'en'])
    expect(loaded.defaultLanguage).toBe('pt')
    expect(loaded.currentLanguage).toBe('en')
  })

  it('coerces theme via resolveTheme (defaults when missing)', () => {
    const loaded = importToPublicMenuLoaded(fixture(), 'pt')
    // resolveTheme guarantees all four keys are present.
    expect(loaded.theme.layout).toBeDefined()
    expect(loaded.theme.font).toBeDefined()
    expect(loaded.theme.primaryColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(loaded.theme.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
