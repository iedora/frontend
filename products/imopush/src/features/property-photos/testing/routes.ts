/**
 * Property-photos slice routes — single source of truth for specs.
 * Mirrors the per-slice testing/routes.ts pattern from products/menu.
 */
export const propertyPhotosRoutes = {
  /** Property detail page (where the photo upload lives). */
  detail: (reference: string) => `/dashboard/p/${reference}`,
} as const
