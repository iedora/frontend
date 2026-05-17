import type { IdentityEventName, IdentityEventOf } from "./events";

/**
 * One subscriber's destination. Persisted in genkan's `webhook_subscription`
 * table; the sender reads it through a port at delivery time.
 */
export type WebhookSubscription = {
  /** Absolute HTTPS URL — the subscriber's POST endpoint. */
  url: string;
  /** Shared HMAC secret. Both sides sign/verify with it. */
  secret: string;
  /**
   * Optional event allow-list. If absent, the subscriber receives every
   * event in the union. Empty array means "nothing" — explicit opt-out.
   */
  events?: IdentityEventName[];
};

/**
 * Telemetry for one delivery attempt. The sender invokes
 * `opts.onDelivery` with this so callers can log / persist to an outbox.
 */
export type DeliveryResult = {
  url: string;
  event: IdentityEventName;
  attempt: number;
  status: "ok" | "failed";
  http?: number;
  error?: string;
};

/**
 * Type-safe handler map for the receiver. Each entry is keyed by the event
 * tag and typed by the matching payload. Handlers are async-or-sync.
 */
export type HandlerMap = {
  [K in IdentityEventName]: (
    payload: IdentityEventOf<K>,
  ) => void | Promise<void>;
};

/**
 * Idempotency store for the receiver. The default is an in-process
 * `Map<id, expiresAtMs>` (good enough for single-instance products).
 * Multi-instance deployments should swap in a Redis or Postgres-backed
 * implementation so a duplicate replayed at a different replica is still
 * caught.
 *
 * Contract:
 *  - `has(id)` returns true iff the id was remembered AND not yet expired.
 *  - `remember(id, ttlMs)` stores the id for at least `ttlMs` milliseconds.
 *    Implementations MAY persist longer; they MUST NOT persist shorter.
 *
 * Both methods are async because the prod implementation will likely
 * involve a network round-trip; the default in-memory one returns
 * resolved promises.
 */
export type DedupStore = {
  has(id: string): Promise<boolean>;
  remember(id: string, ttlMs: number): Promise<void>;
};
