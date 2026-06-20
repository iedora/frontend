import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import {
  loadPublicMenu,
  PublicMenuView,
} from '@iedora/product-menu/features/menu-publishing/rsc/public-menu-view'
import { LanguageGate } from '@iedora/product-menu/features/menu-publishing/rsc/language-gate'

/**
 * Branded / marketing URL for the public menu. The QR sticker URL
 * `/q/[code]` is the other entry-point and renders the same content
 * (see `app/q/[code]/page.tsx`). This route is what we want indexed
 * by search engines and shared on social channels.
 */

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const h = await headers()
  const data = await loadPublicMenu(slug, sp.lang, h.get('accept-language'))
  if (!data) return { title: 'Menu not found' }
  return {
    title: `${data.restaurant.name} · Menu`,
    description:
      data.restaurant.description ?? `Digital menu for ${data.restaurant.name}.`,
    alternates: { canonical: `/r/${data.restaurant.slug}` },
  }
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const [h, cookieStore] = await Promise.all([headers(), cookies()])
  // Explicit language: the `?lang=` query wins, then a remembered choice
  // from a previous gate visit (per-restaurant cookie).
  const cookieLang = cookieStore.get(`iedora_lang_${slug}`)?.value
  const data = await loadPublicMenu(slug, sp.lang ?? cookieLang, h.get('accept-language'))
  if (!data) notFound()

  // First multi-language visit with no explicit choice → show the gate
  // (Pencil "Guest · Language gate"). Auto-selection still covers single
  // language menus and returning visitors (the gate sets the cookie).
  if (!sp.lang && !cookieLang && data.supportedLanguages.length > 1) {
    return (
      <LanguageGate
        slug={slug}
        restaurantName={data.restaurant.name}
        logoUrl={data.restaurant.logoUrl}
        primaryColor={data.theme.primaryColor}
        languages={data.supportedLanguages}
        current={data.currentLanguage}
      />
    )
  }

  return <PublicMenuView data={data} />
}
