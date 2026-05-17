import { describe, expect, it, vi } from "vitest";
import { createWebhookSender } from "../sender";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER } from "../events";
import {
  parseSignatureHeader,
  signSignedPayload,
  verifySignature,
} from "../signature";
import type { DeliveryResult, WebhookSubscription } from "../types";

function fakeFetch(
  impl: (req: {
    url: string;
    body: string;
    signature: string;
    timestamp: string;
  }) => Response,
) {
  return vi.fn(
    async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      const body = typeof init?.body === "string" ? init.body : "";
      const headers = init?.headers as Record<string, string> | undefined;
      const signature = headers?.[SIGNATURE_HEADER] ?? "";
      const timestamp = headers?.[TIMESTAMP_HEADER] ?? "";
      return impl({ url, body, signature, timestamp });
    },
  );
}

const NO_BACKOFF = { attempts: 3, backoffMs: () => 0 };
// Every test URL points at example.test — never resolves on a private
// network, so the SSRF guard is happy. The fetch is stubbed anyway.
const PUBLIC_URL_A = "https://a.example.test/hook";
const PUBLIC_URL_B = "https://b.example.test/hook";
const PUBLIC_URL_X = "https://x.example.test/hook";
const PUBLIC_URL_Y = "https://y.example.test/hook";

describe("sender", () => {
  it("signs the body with each subscription's secret (Stripe-style t=,v1= header)", async () => {
    const subs: WebhookSubscription[] = [
      { url: PUBLIC_URL_A, secret: "secret-a" },
      { url: PUBLIC_URL_B, secret: "secret-b" },
    ];
    const seen: {
      url: string;
      body: string;
      signature: string;
      timestamp: string;
    }[] = [];
    const fetchFn = fakeFetch(({ url, body, signature, timestamp }) => {
      seen.push({ url, body, signature, timestamp });
      return new Response("ok", { status: 200 });
    });

    const sender = createWebhookSender({
      listSubscriptions: async () => subs,
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      // Stub URLs never resolve in DNS; allow-private bypasses the guard
      // here. Real DNS resolution is covered in ssrf.test.ts.
      allowPrivateNetworks: true,
    });

    await sender.emit({
      event: "user.deleted",
      payload: { user_id: "u1" },
    });

    expect(seen).toHaveLength(2);
    for (const s of seen) {
      const sub = subs.find((x) => x.url === s.url);
      expect(sub).toBeDefined();
      // Header is the Stripe-style format.
      expect(s.signature).toMatch(/^t=\d+,v1=[0-9a-f]+$/);
      const parsed = parseSignatureHeader(s.signature);
      expect(parsed).not.toBeNull();
      // Side-channel timestamp matches the one inside the sig header.
      expect(s.timestamp).toBe(String(parsed!.timestampMs));
      // High-level verification path accepts the new format.
      expect(verifySignature(sub!.secret, s.body, s.signature)).toBe(true);
      // Same body to every subscriber — only the signature differs.
      const parsedBody = JSON.parse(s.body);
      expect(parsedBody.event).toBe("user.deleted");
      expect(parsedBody.payload.user_id).toBe("u1");
      expect(typeof parsedBody.id).toBe("string");
      expect(typeof parsedBody.occurred_at).toBe("string");
    }
  });

  it("emits the x-iedora-timestamp side-channel header on every POST", async () => {
    let seenTimestamp = "";
    const fetchFn = fakeFetch(({ timestamp }) => {
      seenTimestamp = timestamp;
      return new Response("ok", { status: 200 });
    });
    const sender = createWebhookSender({
      listSubscriptions: async () => [{ url: PUBLIC_URL_X, secret: "s" }],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      allowPrivateNetworks: true,
    });
    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });
    expect(seenTimestamp).toMatch(/^\d+$/);
  });

  it("signature is a fresh HMAC over `${t}.${body}` (not body alone)", async () => {
    let captured: { body: string; signature: string } | null = null;
    const fetchFn = fakeFetch(({ body, signature }) => {
      captured = { body, signature };
      return new Response("ok", { status: 200 });
    });
    const sender = createWebhookSender({
      listSubscriptions: async () => [
        { url: PUBLIC_URL_X, secret: "shh" },
      ],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      allowPrivateNetworks: true,
    });
    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });
    expect(captured).not.toBeNull();
    const parsed = parseSignatureHeader(captured!.signature)!;
    const expected = signSignedPayload(
      "shh",
      parsed.timestampMs,
      captured!.body,
    );
    expect(parsed.signatures).toContain(expected);
  });

  it("retries on 5xx and succeeds on a later attempt", async () => {
    let calls = 0;
    const fetchFn = fakeFetch(() => {
      calls++;
      return new Response("server error", {
        status: calls < 3 ? 503 : 200,
      });
    });
    const results: DeliveryResult[] = [];
    const sender = createWebhookSender({
      listSubscriptions: async () => [{ url: PUBLIC_URL_X, secret: "s" }],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      onDelivery: (r) => results.push(r),
      allowPrivateNetworks: true,
    });

    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });

    expect(calls).toBe(3);
    expect(results.map((r) => r.status)).toEqual(["failed", "failed", "ok"]);
    expect(results[2]?.attempt).toBe(3);
  });

  it("does NOT retry on 4xx", async () => {
    let calls = 0;
    const fetchFn = fakeFetch(() => {
      calls++;
      return new Response("nope", { status: 400 });
    });
    const results: DeliveryResult[] = [];
    const sender = createWebhookSender({
      listSubscriptions: async () => [{ url: PUBLIC_URL_X, secret: "s" }],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      onDelivery: (r) => results.push(r),
      allowPrivateNetworks: true,
    });

    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });

    expect(calls).toBe(1);
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.http).toBe(400);
  });

  it("retries on network error then succeeds", async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls++;
      if (calls < 2) throw new Error("ECONNRESET");
      return new Response("ok", { status: 200 });
    });
    const results: DeliveryResult[] = [];
    const sender = createWebhookSender({
      listSubscriptions: async () => [{ url: PUBLIC_URL_X, secret: "s" }],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      onDelivery: (r) => results.push(r),
      allowPrivateNetworks: true,
    });

    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });

    expect(calls).toBe(2);
    expect(results.map((r) => r.status)).toEqual(["failed", "ok"]);
  });

  it("respects the allow-list when set", async () => {
    const fetchFn = fakeFetch(() => new Response("ok", { status: 200 }));
    const sender = createWebhookSender({
      listSubscriptions: async () => [
        // Subscribed only to user.* events.
        {
          url: PUBLIC_URL_X,
          secret: "s",
          events: ["user.deleted", "user.banned"],
        },
        // Subscribed to everything (no allow-list).
        { url: PUBLIC_URL_Y, secret: "s" },
      ],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      allowPrivateNetworks: true,
    });

    // Off-list event: only the everything-subscriber gets it.
    await sender.emit({
      event: "org.deleted",
      payload: { org_id: "o1" },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const firstCall = fetchFn.mock.calls[0]?.[0];
    expect(firstCall).toBe(PUBLIC_URL_Y);

    // On-list event: both subscribers get it.
    fetchFn.mockClear();
    await sender.emit({
      event: "user.deleted",
      payload: { user_id: "u1" },
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("treats an empty events array as 'nothing'", async () => {
    const fetchFn = fakeFetch(() => new Response("ok", { status: 200 }));
    const sender = createWebhookSender({
      listSubscriptions: async () => [
        { url: PUBLIC_URL_X, secret: "s", events: [] },
      ],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      allowPrivateNetworks: true,
    });

    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects a subscription URL pointing at a private 10.x address", async () => {
    const fetchFn = vi.fn(async () => new Response("ok", { status: 200 }));
    const results: DeliveryResult[] = [];
    const sender = createWebhookSender({
      listSubscriptions: async () => [
        { url: "http://10.0.0.5/hook", secret: "s" },
      ],
      fetch: fetchFn as unknown as typeof fetch,
      retries: NO_BACKOFF,
      onDelivery: (r) => results.push(r),
      // Defaults to false; assert that explicitly here.
    });

    await sender.emit({ event: "user.deleted", payload: { user_id: "u1" } });

    // Fetch must never be invoked when SSRF guard fires.
    expect(fetchFn).not.toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.error).toMatch(/^ssrf:/);
  });
});
