import { describe, expect, it } from 'vitest'
import { restaurantImportSchema } from './schema'
import { EXAMPLES } from './examples'

describe('restaurantImportSchema · positive cases', () => {
  // Every example we ship MUST validate. If an example breaks the
  // schema, both the IDE picker and the LLM prompt would mislead users.
  it.each(EXAMPLES.map((e) => [e.id, e.data] as const))(
    'example "%s" parses cleanly',
    (_id, data) => {
      const result = restaurantImportSchema.safeParse(data)
      if (!result.success) {
        console.error(result.error.issues)
      }
      expect(result.success).toBe(true)
    },
  )

  it('applies default plan="free" when tenant.plan omitted', () => {
    const parsed = restaurantImportSchema.parse({
      user: { email: 'a@b.com', password: 'longenough' },
      tenant: {},
      restaurant: {
        name: 'X',
        defaultLanguage: 'pt',
        supportedLanguages: ['pt'],
      },
      menu: { name: 'M', categories: [] },
    })
    expect(parsed.tenant.plan).toBe('free')
  })

  it('applies default tenant={ plan:"free" } when tenant omitted', () => {
    const parsed = restaurantImportSchema.parse({
      user: { email: 'a@b.com', password: 'longenough' },
      restaurant: {
        name: 'X',
        defaultLanguage: 'pt',
        supportedLanguages: ['pt'],
      },
      menu: { name: 'M', categories: [] },
    })
    expect(parsed.tenant.plan).toBe('free')
  })

  it('applies default menu.name="Main menu" when omitted', () => {
    const parsed = restaurantImportSchema.parse({
      user: { email: 'a@b.com', password: 'longenough' },
      restaurant: {
        name: 'X',
        defaultLanguage: 'pt',
        supportedLanguages: ['pt'],
      },
      menu: { categories: [] },
    })
    expect(parsed.menu.name).toBe('Main menu')
  })

  it('keeps only recognised language keys in *I18n maps', () => {
    // The localizedText transform drops unknown language codes — better
    // than rejecting the whole payload when an LLM tosses in 'de'.
    const parsed = restaurantImportSchema.parse({
      user: { email: 'a@b.com', password: 'longenough' },
      restaurant: {
        name: 'X',
        description: 'plain',
        descriptionI18n: { en: 'english', de: 'german (dropped)', es: 'spanish' },
        defaultLanguage: 'pt',
        supportedLanguages: ['pt'],
      },
      menu: { name: 'M', categories: [] },
    })
    expect(parsed.restaurant.descriptionI18n).toEqual({
      en: 'english',
      es: 'spanish',
    })
    expect(parsed.restaurant.descriptionI18n).not.toHaveProperty('de')
  })

  it('collapses i18n map to undefined when no recognised keys survive', () => {
    const parsed = restaurantImportSchema.parse({
      user: { email: 'a@b.com', password: 'longenough' },
      restaurant: {
        name: 'X',
        descriptionI18n: { de: 'only german' },
        defaultLanguage: 'pt',
        supportedLanguages: ['pt'],
      },
      menu: { name: 'M', categories: [] },
    })
    expect(parsed.restaurant.descriptionI18n).toBeUndefined()
  })

  it('passes through theme extras (forward-compatible jsonb)', () => {
    const parsed = restaurantImportSchema.parse({
      user: { email: 'a@b.com', password: 'longenough' },
      restaurant: {
        name: 'X',
        defaultLanguage: 'pt',
        supportedLanguages: ['pt'],
        theme: { primaryColor: '#abc', layout: 'classic', extra: 'kept' },
      },
      menu: { name: 'M', categories: [] },
    })
    expect(parsed.restaurant.theme).toMatchObject({
      primaryColor: '#abc',
      layout: 'classic',
      extra: 'kept',
    })
  })
})

describe('restaurantImportSchema · rejection cases', () => {
  function expectFail(input: unknown, pathContains: string) {
    const result = restaurantImportSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths.some((p) => p.includes(pathContains))).toBe(true)
    }
  }

  it('rejects password shorter than 8 chars', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'short' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'pt',
          supportedLanguages: ['pt'],
        },
        menu: { name: 'M', categories: [] },
      },
      'user.password',
    )
  })

  it('rejects invalid email', () => {
    expectFail(
      {
        user: { email: 'not-an-email', password: 'longenough' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'pt',
          supportedLanguages: ['pt'],
        },
        menu: { name: 'M', categories: [] },
      },
      'user.email',
    )
  })

  it('rejects unsupported defaultLanguage', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'longenough' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'de', // not in en/pt/es/fr
          supportedLanguages: ['en'],
        },
        menu: { name: 'M', categories: [] },
      },
      'defaultLanguage',
    )
  })

  it('rejects unsupported theme.layout', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'longenough' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'pt',
          supportedLanguages: ['pt'],
          theme: { layout: 'futuristic' },
        },
        menu: { name: 'M', categories: [] },
      },
      'theme.layout',
    )
  })

  it('rejects negative priceCents', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'longenough' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'pt',
          supportedLanguages: ['pt'],
        },
        menu: {
          name: 'M',
          categories: [
            { name: 'C', items: [{ name: 'I', priceCents: -1 }] },
          ],
        },
      },
      'priceCents',
    )
  })

  it('rejects priceCents above the 10 000,00 cap', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'longenough' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'pt',
          supportedLanguages: ['pt'],
        },
        menu: {
          name: 'M',
          categories: [
            {
              name: 'C',
              items: [{ name: 'I', priceCents: 10_000_01 }],
            },
          ],
        },
      },
      'priceCents',
    )
  })

  it('rejects empty restaurant.name', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'longenough' },
        restaurant: {
          name: '',
          defaultLanguage: 'pt',
          supportedLanguages: ['pt'],
        },
        menu: { name: 'M', categories: [] },
      },
      'restaurant.name',
    )
  })

  it('rejects empty supportedLanguages array', () => {
    expectFail(
      {
        user: { email: 'a@b.com', password: 'longenough' },
        restaurant: {
          name: 'X',
          defaultLanguage: 'pt',
          supportedLanguages: [],
        },
        menu: { name: 'M', categories: [] },
      },
      'supportedLanguages',
    )
  })
})
