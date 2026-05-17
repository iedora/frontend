import Link from 'next/link'
import {
  Card,
  CardDesc,
  CardFoot,
  CardIndex,
  CardTitle,
} from '@iedora/design-system'
import { requireAdmin } from '@/features/admin'
import { PageHead } from './_lib/editorial'

export const metadata = { title: 'Admin' }

const SECTIONS: Array<{
  index: string
  title: string
  href: string
  desc: string
}> = [
  {
    index: '/ 01',
    title: 'Users',
    href: '/admin/users',
    desc:
      'Every account on the platform. Inspect a row to ban, set a role, revoke sessions, or impersonate.',
  },
  {
    index: '/ 02',
    title: 'Organizations',
    href: '/admin/organizations',
    desc:
      'Tenants and their memberships. Create or delete an org, invite a member, or kick one.',
  },
  {
    index: '/ 03',
    title: 'Applications',
    href: '/admin/applications',
    desc:
      'Registered OAuth clients. Provision a new app for an internal product or a third party.',
  },
  {
    index: '/ 04',
    title: 'Grants',
    href: '/admin/grants',
    desc:
      'Scope consents users have granted to OAuth clients. Revoke per row to invalidate tokens.',
  },
  {
    index: '/ 05',
    title: 'Sessions',
    href: '/admin/sessions',
    desc:
      'All active sessions across users. Revoke individually to log a user out of one device.',
  },
  {
    index: '/ 06',
    title: 'Audit',
    href: '/admin/audit',
    desc:
      'Read-only log derived from existing signals: bans, impersonations, app registrations.',
  },
]

export default async function AdminHomePage() {
  await requireAdmin('/admin')

  return (
    <>
      <PageHead
        eyebrow="/ 00  Index"
        title="The control room."
        note="Genkan, viewed from the inside. Every surface that isn't an OIDC endpoint lives here."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
        }}
      >
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <Card>
              <CardIndex>{s.index}</CardIndex>
              <CardTitle as="h3">{s.title}</CardTitle>
              <CardDesc>{s.desc}</CardDesc>
              <CardFoot>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-55)',
                  }}
                >
                  Open ↗
                </span>
              </CardFoot>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
