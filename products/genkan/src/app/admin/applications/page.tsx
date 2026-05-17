import Link from 'next/link'
import {
  Badge,
  EmptyState,
  Table,
  TableRowNum,
  Td,
  Th,
} from '@iedora/design-system'
import { requireAdmin } from '@/features/admin'
import { listApplications } from '@/features/admin/use-cases/list-applications'
import { PageHead, Mono } from '../_lib/editorial'
import { SearchBox } from '../_lib/search-box'
import { RegisterApplicationDialog } from './applications-actions.client'

export const metadata = { title: 'Applications · Admin' }

type SearchParams = Promise<{ q?: string }>

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-CA').format(d)
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin('/admin/applications')
  const { q } = await searchParams
  const apps = await listApplications({ search: q })

  return (
    <>
      <PageHead
        eyebrow="/ 03  Applications"
        title="OAuth clients."
        note="Registered clients that may complete an OIDC handshake. First-party apps are pre-registered through TRUSTED_CLIENTS."
        actions={
          <>
            <SearchBox placeholder="Search by name or client_id" />
            <RegisterApplicationDialog />
          </>
        }
      />

      {apps.length === 0 ? (
        <EmptyState
          label="No applications"
          note={q ? `Nothing matches “${q}”.` : 'No clients registered yet.'}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th style={{ width: '4ch' }}>N</Th>
              <Th>Name</Th>
              <Th>Client ID</Th>
              <Th>Redirect URIs</Th>
              <Th>Scope</Th>
              <Th>Trusted</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a, i) => (
              <tr key={a.id}>
                <Td>
                  <TableRowNum>{String(i + 1).padStart(2, '0')}</TableRowNum>
                </Td>
                <Td>
                  <Link
                    href={`/admin/applications/${a.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    {a.name ?? <Mono>—</Mono>}
                  </Link>
                </Td>
                <Td>
                  <Mono>{a.clientId}</Mono>
                </Td>
                <Td
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-70)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {a.redirectUris.join('\n')}
                </Td>
                <Td>
                  <Mono>{a.scopes.join(' ') || '—'}</Mono>
                </Td>
                <Td>
                  {a.skipConsent ? (
                    <Badge variant="ink">First-party</Badge>
                  ) : (
                    <Badge variant="ghost">Third-party</Badge>
                  )}
                </Td>
                <Td>
                  <Mono>{fmtDate(a.createdAt)}</Mono>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
