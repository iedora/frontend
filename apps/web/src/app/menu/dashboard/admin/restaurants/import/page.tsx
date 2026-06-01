import { requireScope } from '@iedora/product-menu/features/auth'
import { SCOPES } from '@iedora/auth/scopes'
import { DashboardPage } from '@iedora/product-menu/shared/ui/dashboard-page'
import { ImportIde } from './import-ide'

/**
 * Staff-only "JSON-import IDE". Two-pane editor (code + live preview)
 * that drives `importRestaurantFromJsonAction`. Same scope as the
 * cross-tenant restaurants surface — `staff:menu:restaurants:transfer`.
 */
export default async function ImportRestaurantsPage() {
  await requireScope(SCOPES.menu.staff.restaurants.transfer)

  return (
    <DashboardPage
      title="Importar restaurante (JSON)"
      description="Cola o JSON à esquerda, vê o restaurante a renderizar à direita em tempo real. Cria utilizador + tenant + subscrição + restaurante + menu num só passo."
      crumbs={[{ label: 'Restaurantes', href: '/menu/dashboard/admin/restaurants' }]}
      data-test-id="admin-restaurants-import-page"
    >
      <ImportIde />
    </DashboardPage>
  )
}
