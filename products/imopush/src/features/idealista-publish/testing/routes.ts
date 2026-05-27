/**
 * Idealista-publish slice routes — single source of truth for specs.
 * Mirrors the per-slice testing/routes.ts pattern from products/menu.
 */
export const idealistaPublishRoutes = {
  /** Per-property publish button lives on the property detail page. */
  detail: (reference: string) => `/dashboard/p/${reference}`,
  /** Integrator configuration page. */
  integrator: '/dashboard/integrators/idealista',
} as const
