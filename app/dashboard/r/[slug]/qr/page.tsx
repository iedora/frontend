import Link from 'next/link'
import { requireRestaurantBySlug } from '@/lib/dal'
import { QrViewer } from './qr-viewer'

export default async function QrPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { restaurant: r } = await requireRestaurantBySlug(slug)

  // BETTER_AUTH_URL doubles as the canonical app origin (dev: localhost, prod:
  // production domain). The public menu lives at `<origin>/r/<slug>`.
  const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
  const publicUrl = `${origin.replace(/\/$/, '')}/r/${r.slug}`

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/r/${slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {r.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">QR code</h1>
        <p className="text-sm text-muted-foreground">
          Print this on table tents or stickers — scanning opens the menu at{' '}
          <span className="font-mono">{publicUrl}</span>.
        </p>
      </div>

      <QrViewer publicUrl={publicUrl} restaurantName={r.name} />
    </div>
  )
}
