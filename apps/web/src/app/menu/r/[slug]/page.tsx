import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import {
  loadPublicMenu,
  PublicMenuView,
} from '@iedora/product-menu/features/menu-publishing/rsc/public-menu-view'

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
  // Language is auto-negotiated, no gate / prompt: an explicit `?lang=` (from the
  // switcher) wins, then a remembered choice cookie, then the browser's
  // Accept-Language header — the backend's pickLanguage() resolves the best
  // supported match and falls back to the restaurant default. The diner lands
  // straight on the menu in their own language and can still switch.
  const cookieLang = cookieStore.get(`iedora_lang_${slug}`)?.value
  const data = await loadPublicMenu(slug, sp.lang ?? cookieLang, h.get('accept-language'))
  if (!data) notFound()

  return <PublicMenuView data={data} />
}
