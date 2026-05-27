import { getTranslations } from 'next-intl/server'
import { Building2 } from 'lucide-react'
import {
  DashboardPage,
  Button,
  Card,
  CardTitle,
  CardDesc,
  EditorialList,
  StatusChip,
  type EditorialRowData,
} from '@iedora/design-system'
import { listProperties } from '@/shared/data/properties-data'
import {
  formatPrice,
  formatTypePT,
  formatOperationPT,
} from '@/shared/data/properties'

const INTEGRATOR_CONFIG = {
  idealista: { label: 'Idealista', Icon: Building2 },
} as const

const INTEGRATORS = Object.keys(INTEGRATOR_CONFIG) as Array<
  keyof typeof INTEGRATOR_CONFIG
>

export default async function DashboardHome() {
  const t = await getTranslations('PropertyList')
  const tProp = await getTranslations('Property')
  const properties = await listProperties()

  const actions = (
    <Button variant="accent" href="/dashboard/p/new" data-test-id="properties-new">
      {t('newProperty')}
    </Button>
  )

  const rows: EditorialRowData[] = properties.map((p) => {
    const f = p.features ?? {}
    const area = f.constructedAreaSqm ?? p.sizeSqm
    const integrators = p.integrators ?? []

    const stats: string[] = []
    if (p.rooms) stats.push(tProp('rooms', { count: p.rooms }))
    if (area) stats.push(`${area} m²`)
    if (p.bathrooms) stats.push(tProp('bathrooms', { count: p.bathrooms }))

    const extraActions =
      INTEGRATORS.length > 0 ? (
        <>
          {INTEGRATORS.map((key) => {
            const cfg = INTEGRATOR_CONFIG[key]
            const status = integrators.find((i) => i.key === key)?.status
            const variant =
              status === 'published'
                ? 'success'
                : status === 'failed'
                  ? 'danger'
                  : 'neutral'
            return (
              <StatusChip
                key={key}
                label={cfg.label}
                icon={<cfg.Icon size={11} />}
                variant={variant}
              />
            )
          })}
        </>
      ) : undefined

    return {
      id: p.reference,
      href: `/dashboard/p/${p.reference}`,
      title: p.reference,
      image: p.photoUrls?.[0],
      subtitle: (
        <>
          <span>{formatTypePT(p.type)}</span>
          <span aria-hidden="true">·</span>
          <span>{p.address.locality}</span>
        </>
      ),
      metadata: stats.join(' · ') || undefined,
      trailing: {
        value: null,
        label: formatPrice(p.priceCents),
        comparison: formatOperationPT(p.operation),
      },
      extraActions,
    }
  })

  return (
    <DashboardPage
      title={t('title')}
      data-test-id="properties"
      actions={actions}
    >
      <EditorialList
        testId="properties-list"
        rows={rows}
        emptyState={
          <Card>
            <CardTitle>{t('emptyLabel')}</CardTitle>
            <CardDesc>{t('emptyHint')}</CardDesc>
          </Card>
        }
      />
    </DashboardPage>
  )
}
