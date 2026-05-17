import { describe, expect, it, vi } from "vitest";
import { createWebhookReceiver } from "../receiver";
import { SIGNATURE_HEADER } from "../events";
import {
  formatSignatureHeader,
  formatStripeStyleHeader,
  signPayload,
  signSignedPayload,
} from "../signature";

const SECRET = "shared-test-secret";
// Stable epoch the freshness window is measured against in these tests.
const NOW_MS = Date.parse("2026-05-17T12:00:00.000Z");

function makeRequest(body: string, signature?: string): Request {
  return new Request("https://app.test/api/identity/webhook", {
    method: "POST",
    headers: signature
      ? { [SIGNATURE_HEADER]: signature, "content-type": "application/json" }
      : { "content-type": "application/json" },
    body,
  });
}

function freshSig(secret: string, body: string, t = NOW_MS): string {
  return formatStripeStyleHeader(t, signSignedPayload(secret, t, body));
}

describe("receiver", () => {
  it("returns 200 and runs the handler on a valid signature", async () => {
    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      now: () => NOW_MS,
    });

    const body = JSON.stringify({
      id: "evt_ok_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = freshSig(SECRET, body);
    const res = await receiver.POST(makeRequest(body, sig));

    expect(res.status).toBe(200);
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(onDeleted).toHaveBeenCalledWith({ user_id: "u1" });
  });

  it("returns 401 on a bad signature", async () => {
    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      now: () => NOW_MS,
    });

    const body = JSON.stringify({
      id: "evt_bad_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = formatStripeStyleHeader(NOW_MS, "0".repeat(64));
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(401);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("returns 401 when the signature header is missing", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
    });
    const body = "{}";
    const res = await receiver.POST(makeRequest(body));
    expect(res.status).toBe(401);
  });

  it("returns 400 on malformed JSON (even with a valid signature)", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
    });
    const body = "not json";
    const sig = freshSig(SECRET, body);
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the envelope is missing required fields", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({ event: "user.deleted" });
    const sig = freshSig(SECRET, body);
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the handler throws", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: {
        "user.deleted": async () => {
          throw new Error("kaboom");
        },
      },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_throw_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = freshSig(SECRET, body);
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(500);
  });

  it("returns 200 on events without a registered handler (no-op)", async () => {
    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      warnOnUnknown: false,
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_noop_1",
      event: "org.created",
      payload: { org_id: "o1", slug: "acme", name: "Acme" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = freshSig(SECRET, body);
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("guards against the JSON.parse-then-stringify trap (key order)", async () => {
    // Two valid JSONs of the same envelope with different key order.
    const a =
      '{"id":"evt_ko_a","event":"user.deleted","payload":{"user_id":"u1"},"occurred_at":"2026-05-17T00:00:00.000Z"}';
    const b =
      '{"event":"user.deleted","id":"evt_ko_b","occurred_at":"2026-05-17T00:00:00.000Z","payload":{"user_id":"u1"}}';

    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      now: () => NOW_MS,
    });

    const sigA = freshSig(SECRET, a);
    // sigA matches a, but NOT b — even though they parse to equal objects.
    const resA = await receiver.POST(makeRequest(a, sigA));
    expect(resA.status).toBe(200);
    const resB = await receiver.POST(makeRequest(b, sigA));
    expect(resB.status).toBe(401);
  });

  it("rejects a timestamp older than the 5-minute window", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_stale_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const stale = NOW_MS - 6 * 60_000; // 6 minutes ago
    const sig = formatStripeStyleHeader(
      stale,
      signSignedPayload(SECRET, stale, body),
    );
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(401);
  });

  it("rejects a timestamp too far in the future", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_future_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const future = NOW_MS + 10 * 60_000; // 10 minutes ahead
    const sig = formatStripeStyleHeader(
      future,
      signSignedPayload(SECRET, future, body),
    );
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(401);
  });

  it("accepts a custom toleranceMs window", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
      toleranceMs: 10 * 60_000, // 10 minutes
    });
    const body = JSON.stringify({
      id: "evt_tol_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const t = NOW_MS - 6 * 60_000; // 6 minutes ago — outside default, inside 10m
    const sig = formatStripeStyleHeader(
      t,
      signSignedPayload(SECRET, t, body),
    );
    const res = await receiver.POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
  });

  it("deduplicates by envelope id within the TTL: same id → 200 but handler NOT called", async () => {
    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_dup_xyz",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = freshSig(SECRET, body);

    const r1 = await receiver.POST(makeRequest(body, sig));
    const r2 = await receiver.POST(makeRequest(body, sig));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("does NOT dedupe different envelope ids", async () => {
    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      now: () => NOW_MS,
    });
    const bodyA = JSON.stringify({
      id: "evt_unique_a",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const bodyB = JSON.stringify({
      id: "evt_unique_b",
      event: "user.deleted",
      payload: { user_id: "u2" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sigA = freshSig(SECRET, bodyA);
    const sigB = freshSig(SECRET, bodyB);

    await receiver.POST(makeRequest(bodyA, sigA));
    await receiver.POST(makeRequest(bodyB, sigB));
    expect(onDeleted).toHaveBeenCalledTimes(2);
  });

  it("does NOT remember the id when the handler throws (so the sender retry succeeds)", async () => {
    let attempts = 0;
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: {
        "user.deleted": async () => {
          attempts++;
          if (attempts < 2) throw new Error("transient");
        },
      },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_retry_xyz",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = freshSig(SECRET, body);

    const r1 = await receiver.POST(makeRequest(body, sig));
    expect(r1.status).toBe(500);
    // Same id, second attempt — must run the handler again (no dedup
    // after the previous failure).
    const r2 = await receiver.POST(makeRequest(body, sig));
    expect(r2.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it("supports a custom DedupStore", async () => {
    const seen = new Set<string>();
    const store = {
      async has(id: string) {
        return seen.has(id);
      },
      async remember(id: string) {
        seen.add(id);
      },
    };
    const onDeleted = vi.fn();
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": onDeleted },
      now: () => NOW_MS,
      dedupStore: store,
    });
    const body = JSON.stringify({
      id: "evt_custom_store_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    const sig = freshSig(SECRET, body);
    await receiver.POST(makeRequest(body, sig));
    await receiver.POST(makeRequest(body, sig));
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(seen.has("evt_custom_store_1")).toBe(true);
  });

  it("rejects a malformed signature header (wrong format)", async () => {
    const receiver = createWebhookReceiver({
      secret: SECRET,
      on: { "user.deleted": vi.fn() },
      now: () => NOW_MS,
    });
    const body = JSON.stringify({
      id: "evt_mal_1",
      event: "user.deleted",
      payload: { user_id: "u1" },
      occurred_at: "2026-05-17T00:00:00.000Z",
    });
    // Legacy `sha256=…` form: the *receiver* requires the new t=,v1=
    // format because the freshness check is mandatory.
    const legacy = formatSignatureHeader(signPayload(SECRET, body));
    const res = await receiver.POST(makeRequest(body, legacy));
    expect(res.status).toBe(401);
  });
});
