import 'server-only'
import {
  createWebhookSender,
  type DeliveryResult,
  type IdentityEvent,
} from '@iedora/identity'
import { listSubscriptions } from './adapters/drizzle'

/**
 * One sender per process. The closure pins the production Drizzle adapter
 * — tests should not import this module and should construct their own
 * sender via `createWebhookSender` directly.
 *
 * The default `onDelivery` here is a console log; we'll route this into a
 * persistent outbox + audit log in a later iteration (out of scope for the
 * first cut). The retry policy is the package default (3 attempts,
 * exponential backoff 0.5s → 2s → 8s).
 */
/**
 * SSRF escape hatch: only honoured outside production. The env var exists
 * so devs running a menu receiver on `http://localhost:3001/...` can wire
 * the webhook without disabling the package guard globally. Production
 * deploys NEVER set this — every subscription URL must resolve to a public
 * address.
 */
const allowPrivateNetworks =
  process.env.NODE_ENV !== 'production' &&
  process.env.IEDORA_WEBHOOKS_ALLOW_PRIVATE === '1'

const sender = createWebhookSender({
  listSubscriptions,
  allowPrivateNetworks,
  onDelivery: (r: DeliveryResult) => {
    if (r.status === 'failed') {
      console.warn(
        `[webhooks] ${r.event} → ${r.url} attempt=${r.attempt} http=${r.http ?? '-'} ${r.error ?? ''}`,
      )
    } else {
      console.log(
        `[webhooks] ${r.event} → ${r.url} ok (attempt ${r.attempt}, http ${r.http ?? '-'})`,
      )
    }
  },
})

/**
 * Public emit API for genkan internals. Wraps the singleton sender and
 * swallows downstream errors — webhook delivery MUST NOT block the
 * originating action. Failures surface through `onDelivery` instead.
 */
export async function emit(event: IdentityEvent): Promise<void> {
  try {
    await sender.emit(event)
  } catch (e) {
    console.error('[webhooks] emit threw — this is a bug in the sender:', e)
  }
}
