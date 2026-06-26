import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireStaff } from '@iedora/product-menu/features/auth'
import { loadMenuJson, loadRestaurantDetail } from '@iedora/product-menu/features/restaurant-identity'
import { ApiError } from '@iedora/api-client'
import { DashboardPage } from '@iedora/product-menu/shared/ui/dashboard-page'
import { MenuJsonForm } from './menu-json-form'

/**
 * Admin "Edit menu as JSON" (`/menu/dashboard/admin/restaurants/[id]/menu`),
 * staff-only. Loads the restaurant's live menu tree in the JSON-import shape and
 * lets an admin replace the whole menu from a pasted document. The visual
 * builder (a normal owner surface, reachable cross-tenant by staff) is linked
 * for granular edits.
 */
export default async function AdminMenuJsonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff()
  const { id } = await params

  const [detail, menusDoc] = await Promise.all([
    loadRestaurantDetail(id).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound()
      throw e
    }),
    loadMenuJson(id).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound()
      throw e
    }),
  ])

  const t = await getTranslations('Admin.menuJson')
  const r = detail.restaurant
  const initialJson = JSON.stringify({ menus: menusDoc.menus }, null, 2)
  const detailHref = `/menu/dashboard/admin/restaurants/${r.id}`
  const builderHref = `/menu/dashboard/r/${r.slug}`

  return (
    <DashboardPage chrome="none" eyebrow={r.name} title={t('title')} data-test-id="admin-menu-json">
      <MenuJsonForm id={r.id} initialJson={initialJson} builderHref={builderHref} detailHref={detailHref} />
    </DashboardPage>
  )
}
