import { z } from 'zod'
import { isLanguageCode, type LanguageCode } from '../i18n'

// LocalizedText = Partial<Record<LanguageCode, string>>. We accept any string
// keys here and let the use-case keep only the recognised language codes —
// strict-mode would reject menus that carry an extra language the platform
// doesn't speak yet, which is the wrong default for an import tool.
const localizedText = z
  .record(z.string(), z.string())
  .optional()
  .transform((rec) => {
    if (!rec) return undefined
    const out: Partial<Record<LanguageCode, string>> = {}
    for (const [k, v] of Object.entries(rec)) {
      if (isLanguageCode(k) && v.length > 0) out[k] = v
    }
    return Object.keys(out).length === 0 ? undefined : out
  })

const languageCode = z.string().refine(isLanguageCode, {
  message: 'unsupported language code',
}) as z.ZodType<LanguageCode>

const themeSchema = z
  .object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    font: z.enum(['inter', 'playfair', 'lora', 'space-grotesk']).optional(),
    layout: z.enum(['classic', 'minimal', 'editorial', 'cards']).optional(),
  })
  .passthrough()
  .optional()

const variantSchema = z.object({
  label: z.string().min(1).max(60),
  labelI18n: localizedText,
  priceCents: z.number().int().min(0).max(10_000_00),
})

const itemSchema = z.object({
  name: z.string().min(1).max(120),
  nameI18n: localizedText,
  description: z.string().max(500).optional(),
  descriptionI18n: localizedText,
  priceCents: z.number().int().min(0).max(10_000_00),
  currency: z.string().length(3).optional(),
  imageUrl: z.string().url().optional(),
  available: z.boolean().optional(),
  tags: z.array(z.string()).max(20).optional(),
  variants: z.array(variantSchema).max(20).optional(),
})

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  nameI18n: localizedText,
  description: z.string().max(500).optional(),
  descriptionI18n: localizedText,
  items: z.array(itemSchema).max(500),
})

const menuSchema = z.object({
  name: z.string().min(1).max(120).default('Main menu'),
  nameI18n: localizedText,
  description: z.string().max(500).optional(),
  descriptionI18n: localizedText,
  categories: z.array(categorySchema).max(100),
})

/**
 * Founder account. The user provisioned here becomes the tenant owner.
 * Password is min-8 to match better-auth's default. Admin operator is
 * responsible for delivering credentials to the restaurant operator
 * out-of-band (this surface is staff-only).
 */
const userSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
})

const tenantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  /** Menu product plan. Defaults to 'free'; staff can seed 'casa' for paid clients. */
  plan: z.enum(['free', 'casa']).default('free'),
})

export const restaurantImportSchema = z.object({
  user: userSchema,
  tenant: tenantSchema.default({ plan: 'free' as const }),
  restaurant: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    descriptionI18n: localizedText,
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    defaultLanguage: languageCode.default('en' as LanguageCode),
    supportedLanguages: z.array(languageCode).min(1).default(['en' as LanguageCode]),
    theme: themeSchema,
  }),
  menu: menuSchema,
})

export type RestaurantImport = z.infer<typeof restaurantImportSchema>
