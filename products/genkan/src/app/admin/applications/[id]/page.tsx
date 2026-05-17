import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, Separator } from '@iedora/design-system'
import { requireAdmin } from '@/features/admin'
import { getApplicationById } from '@/features/admin/use-cases/list-applications'
import { Eyebrow, Mono, PageHead } from '../../_lib/editorial'
import {
  ApplicationForm,
  DeleteApplicationDialog,
  SecretReveal,
} from './application-actions.client'

export const metadata = { title: 'Application · Admin' }

type Params = Promise<{ id: string }>

function fmtDateTime(d: Date | null | undefined) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Params
}) {
  const { id } = await params
  await requireAdmin(`/admin/applications/${id}`)
  const app = await getApplicationById(id)
  if (!app) notFound()

  return (
    <>
      <PageHead
        eyebrow={
          <>
            <Link
              href="/admin/applications"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              / 03  Applications
            </Link>{' '}
            ·{' '}
            <Mono style={{ color: 'var(--ink-55)' }}>{app.clientId}</Mono>
          </>
        }
        title={app.name ?? app.clientId}
        note={
          <em>
            Registered {fmtDateTime(app.createdAt)} ·{' '}
            {app.skipConsent ? (
              <Badge variant="ink">First-party</Badge>
            ) : (
              <Badge variant="ghost">Third-party</Badge>
            )}
          </em>
        }
        actions={
          <DeleteApplicationDialog
            internalId={app.id}
            name={app.name ?? app.clientId}
          />
        }
      />

      {/* Credentials ------------------------------------------------------ */}
      <section style={{ marginBottom: 36 }}>
        <Eyebrow>/ Credentials</Eyebrow>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr',
            gap: '12px 36px',
            marginTop: 12,
            fontFamily: 'var(--serif)',
          }}
        >
          <dt style={dtStyle}>client_id</dt>
          <dd style={ddStyle}>
            <Mono>{app.clientId}</Mono>
          </dd>
          <dt style={dtStyle}>client_secret</dt>
          <dd style={ddStyle}>
            <SecretReveal secret={app.clientSecret} />
          </dd>
          <dt style={dtStyle}>Token auth</dt>
          <dd style={ddStyle}>
            <Mono>{app.tokenEndpointAuthMethod ?? '—'}</Mono>
          </dd>
          <dt style={dtStyle}>Grant types</dt>
          <dd style={ddStyle}>
            <Mono>{app.grantTypes.join(' ') || '—'}</Mono>
          </dd>
          <dt style={dtStyle}>Response types</dt>
          <dd style={ddStyle}>
            <Mono>{app.responseTypes.join(' ') || '—'}</Mono>
          </dd>
          <dt style={dtStyle}>Type</dt>
          <dd style={ddStyle}>
            <Mono>{app.type ?? '—'}</Mono>
          </dd>
          <dt style={dtStyle}>Updated</dt>
          <dd style={ddStyle}>
            <Mono>{fmtDateTime(app.updatedAt)}</Mono>
          </dd>
        </dl>
      </section>

      <Separator />

      {/* Edit ------------------------------------------------------------- */}
      <section style={{ margin: '36px 0' }}>
        <Eyebrow>/ Metadata</Eyebrow>
        <p
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            color: 'var(--ink-70)',
            margin: '12px 0 16px',
          }}
        >
          The pieces a client may legitimately rotate without re-issuing a
          secret. Edit and save.
        </p>
        <ApplicationForm
          internalId={app.id}
          initialName={app.name ?? ''}
          initialRedirectUris={app.redirectUris}
          initialScopes={app.scopes}
        />
      </section>
    </>
  )
}

const dtStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10.5,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--ink-55)',
  alignSelf: 'baseline',
  paddingTop: 4,
}

const ddStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--serif)',
  fontSize: 16,
  color: 'var(--ink)',
}
