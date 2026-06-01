import 'server-only'
import {
  type LanguageCode,
  localizedNullable,
  pickLanguage,
} from '../../i18n'
import { loadRestaurantSnapshot, localizeTree } from '..'
import { resolveTheme } from './theme'
import { PublicMenuView, type PublicMenuLoaded } from './public-menu-view-ui'

/**
 * Server entrypoint: snapshot loader + view re-export. The JSX lives in
 * `./public-menu-view-ui.tsx` (no `server-only`) so client surfaces
 * (admin import IDE live preview) can mount the exact same component.
 *
 * Both /q/[code] and /r/[slug] call `loadPublicMenu(slug, …)` and then
 * render `<PublicMenuView data={loaded} />`.
 */

export { PublicMenuView, type PublicMenuLoaded }

export async function loadPublicMenu(
  slug: string,
  requestedLang: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Promise<PublicMenuLoaded | null> {
  const snap = await loadRestaurantSnapshot(slug)
  if (!snap) return null

  const currentLanguage: LanguageCode = pickLanguage({
    requested: requestedLang,
    acceptLanguage,
    supported: snap.supportedLanguages,
    defaultLanguage: snap.defaultLanguage,
  })

  const menus = localizeTree(snap.tree, currentLanguage, snap.defaultLanguage)

  return {
    restaurant: {
      id: snap.id,
      name: snap.name,
      slug: snap.slug,
      description: localizedNullable(
        snap.description,
        snap.descriptionI18n,
        currentLanguage,
        snap.defaultLanguage,
      ),
      logoUrl: snap.logoUrl,
      bannerUrl: snap.bannerUrl,
    },
    tenantId: snap.tenantId,
    menus,
    theme: resolveTheme(snap.theme),
    defaultLanguage: snap.defaultLanguage,
    supportedLanguages: snap.supportedLanguages,
    currentLanguage,
  }
}
