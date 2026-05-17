import { Badge, EmptyState, Table, Td, Th } from '@iedora/design-system'
import { requireAdmin } from '@/features/admin'
import { listAuditEvents } from '@/features/admin/use-cases/list-audit'
import { Mono, PageHead } from '../_lib/editorial'

export const metadata = { title: 'Audit · Admin' }

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function badgeForKind(kind: 'ban' | 'impersonate' | 'app.register') {
  switch (kind) {
    case 'ban':
      return <Badge variant="accent">Ban</Badge>
    case 'impersonate':
      return <Badge variant="ink">Impersonate</Badge>
    case 'app.register':
      return <Badge variant="live">App registered</Badge>
  }
}

export default async function AdminAuditPage() {
  await requireAdmin('/admin/audit')
  const events = await listAuditEvents()

  return (
    <>
      <PageHead
        eyebrow="/ 06  Audit"
        title="What happened, recently."
        note="Derived for now. Bans + impersonations + app registrations, scanned from the live tables. A dedicated audit_log table is a later task."
      />

      {events.length === 0 ? (
        <EmptyState label="No events" note="The platform has done nothing audit-worthy yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Kind</Th>
              <Th>Actor</Th>
              <Th>Target</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Mono>{fmtDateTime(e.at)}</Mono>
                </Td>
                <Td>{badgeForKind(e.kind)}</Td>
                <Td>
                  <Mono>{e.actor ?? '—'}</Mono>
                </Td>
                <Td>{e.target}</Td>
                <Td>
                  <Mono>{e.detail}</Mono>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
