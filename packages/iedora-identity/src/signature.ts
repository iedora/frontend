import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe/Svix-style signature header version tag. Bumping this (e.g. `v2`)
 * lets us migrate the digest algorithm without breaking old receivers in
 * the same window — verifiers MAY accept multiple `v*=` pairs.
 */
export const SIGNATURE_SCHEME_VERSION = "v1" as const;

/**
 * HMAC-SHA256, hex-encoded. The signature is computed over the **exact raw
 * body bytes** the sender wrote on the wire — never a re-serialized JSON
 * (key order is not stable).
 *
 * This is the low-level primitive. The high-level wire format uses
 * {@link signSignedPayload} to bind the timestamp into the signed bytes,
 * which is what gets shipped in `x-iedora-signature: t=…,v1=…`.
 */
export function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/**
 * Build the canonical signed payload: `${timestamp}.${body}`. The sender
 * HMACs this string; the receiver reconstructs it from the inbound
 * `x-iedora-signature` timestamp and the raw request body.
 *
 * Binding the timestamp into the signature is what makes replay protection
 * cryptographically enforced (rather than a trust-the-clock header
 * pattern).
 */
export function buildSignedPayload(
  timestampMs: number | string,
  body: string,
): string {
  return `${timestampMs}.${body}`;
}

/** Sign `${timestamp}.${body}` with HMAC-SHA256. Returns hex. */
export function signSignedPayload(
  secret: string,
  timestampMs: number | string,
  body: string,
): string {
  return signPayload(secret, buildSignedPayload(timestampMs, body));
}

/**
 * Parsed view of the Stripe/Svix-style `x-iedora-signature` header value
 * (`t=<epoch-ms>,v1=<hex>[,v1=<hex>…]`). `timestampMs` is the raw integer
 * parsed from the `t=` field; `signatures` is every `v1=<hex>` pair (the
 * sender ships one, but the parser is tolerant of multiples so secret
 * rotation can ship two side-by-side).
 */
export type ParsedSignatureHeader = {
  timestampMs: number;
  signatures: string[];
};

/**
 * Parse `t=…,v1=…[,v1=…]` into its components. Returns null on any
 * malformed input — the receiver maps that to a 401 (the contract is "if
 * we can't verify it, reject").
 *
 * Tolerant of:
 *  - extra whitespace around commas / equals
 *  - additional unknown scheme versions (`v2=…`) which are simply ignored
 *  - the legacy bare-hex / `sha256=<hex>` formats (handled by
 *    {@link verifySignature} for backward-compatible verification, NOT here).
 */
export function parseSignatureHeader(
  header: string | null | undefined,
): ParsedSignatureHeader | null {
  if (typeof header !== "string" || header.length === 0) return null;

  let timestampMs: number | null = null;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) return null;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") {
      if (!/^\d+$/.test(value)) return null;
      timestampMs = Number(value);
      if (!Number.isFinite(timestampMs) || timestampMs < 0) return null;
    } else if (key === SIGNATURE_SCHEME_VERSION) {
      if (!/^[0-9a-fA-F]+$/.test(value)) return null;
      signatures.push(value.toLowerCase());
    }
    // Unknown scheme versions are skipped silently (forward-compat).
  }

  if (timestampMs === null || signatures.length === 0) return null;
  return { timestampMs, signatures };
}

/**
 * Constant-time compare of two equal-length hex strings. Returns false on
 * any mismatch including length. Wraps `crypto.timingSafeEqual` — never
 * `===`, never a substring scan.
 */
export function constantTimeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length || ab.length === 0) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Verify a header value against a body. Accepts:
 *   - the new `t=<epoch-ms>,v1=<hex>` form (primary), OR
 *   - the legacy `sha256=<hex>` form, OR
 *   - bare `<hex>` form.
 *
 * For the new form, the signature is checked against the canonical signed
 * payload `${t}.${body}` — binding the timestamp cryptographically so
 * tampering with `t` invalidates the signature. The legacy forms remain
 * supported for the unit-test surface and any pre-existing tooling that
 * may have hard-coded the GitHub/Stripe `sha256=<hex>` convention; new
 * callers should always emit `t=…,v1=…`.
 *
 * Returns false on any malformed input — never throws — so the receiver
 * can map straight to a 401. The compare itself is constant-time
 * (`crypto.timingSafeEqual`).
 */
export function verifySignature(
  secret: string,
  body: string,
  header: string | null | undefined,
): boolean {
  if (typeof header !== "string" || header.length === 0) return false;

  // Primary path: new Stripe/Svix-style header.
  if (header.includes("=") && header.includes(SIGNATURE_SCHEME_VERSION + "=")) {
    const parsed = parseSignatureHeader(header);
    if (!parsed) return false;
    const expected = signSignedPayload(secret, parsed.timestampMs, body);
    for (const candidate of parsed.signatures) {
      if (constantTimeHexEqual(candidate, expected)) return true;
    }
    return false;
  }

  // Legacy path: `sha256=<hex>` or bare `<hex>` over body bytes alone.
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  if (!/^[0-9a-fA-F]+$/.test(provided)) return false;
  const expected = signPayload(secret, body);
  return constantTimeHexEqual(provided.toLowerCase(), expected);
}

/**
 * Format the new signature header from a signed payload digest plus its
 * timestamp.
 */
export function formatStripeStyleHeader(
  timestampMs: number | string,
  digestHex: string,
): string {
  return `t=${timestampMs},${SIGNATURE_SCHEME_VERSION}=${digestHex}`;
}

/**
 * Legacy `sha256=<hex>` header formatter. Kept for backward compatibility
 * with the unit-test fixtures and any external receivers that hard-coded
 * the GitHub/Stripe v1 convention. New sender code uses
 * {@link formatStripeStyleHeader}.
 */
export function formatSignatureHeader(digestHex: string): string {
  return `sha256=${digestHex}`;
}
