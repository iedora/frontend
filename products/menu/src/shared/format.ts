/**
 * Locale-aware money formatting. Cached per (currency) so the Intl
 * constructor isn't re-allocated per call — the menu builder calls
 * this for every item row on every render.
 *
 * Was duplicated 3× across menu-import-wizard, update-menu-dialog,
 * and sortable-item, each with a different hardcoded locale
 * ("en-IE"). This is the canonical form: the user-agent locale via
 * `Intl.NumberFormat(undefined, …)` so `12.34 €` formats as
 * `12,34 €` in pt-PT without any caller knowing about locale plumbing.
 */
const CURRENCY_CACHE = new Map<string, Intl.NumberFormat>()

export function formatPrice(priceCents: number, currency: string): string {
  let fmt = CURRENCY_CACHE.get(currency)
  if (!fmt) {
    fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    CURRENCY_CACHE.set(currency, fmt)
  }
  return fmt.format(priceCents / 100)
}
