import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSignedPayload,
  constantTimeHexEqual,
  formatSignatureHeader,
  formatStripeStyleHeader,
  parseSignatureHeader,
  signPayload,
  signSignedPayload,
  verifySignature,
} from "../signature";

const SECRET = "test-secret-x-32chars-or-whatever";
const BODY = '{"event":"user.deleted","payload":{"user_id":"u1"}}';
const NOW_MS = 1_747_485_900_000; // arbitrary fixed epoch-ms

describe("signature (legacy bare-body form)", () => {
  it("round-trips: sign → verify", () => {
    const sig = formatSignatureHeader(signPayload(SECRET, BODY));
    expect(verifySignature(SECRET, BODY, sig)).toBe(true);
  });

  it("accepts bare hex without the sha256= prefix", () => {
    const hex = signPayload(SECRET, BODY);
    expect(verifySignature(SECRET, BODY, hex)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = formatSignatureHeader(signPayload(SECRET, BODY));
    expect(verifySignature(SECRET, BODY + " ", sig)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const sig = formatSignatureHeader(signPayload(SECRET, BODY));
    expect(verifySignature("different-secret", BODY, sig)).toBe(false);
  });

  it("rejects a missing or empty header", () => {
    expect(verifySignature(SECRET, BODY, null)).toBe(false);
    expect(verifySignature(SECRET, BODY, undefined)).toBe(false);
    expect(verifySignature(SECRET, BODY, "")).toBe(false);
  });

  it("rejects a malformed header (non-hex)", () => {
    expect(verifySignature(SECRET, BODY, "sha256=not-hex!!")).toBe(false);
    expect(verifySignature(SECRET, BODY, "sha256=")).toBe(false);
  });

  it("rejects a hex-but-wrong-length header without crashing", () => {
    expect(verifySignature(SECRET, BODY, "sha256=abcdef")).toBe(false);
  });

  it("is case-insensitive on the hex digest", () => {
    const hex = signPayload(SECRET, BODY);
    expect(verifySignature(SECRET, BODY, `sha256=${hex.toUpperCase()}`)).toBe(
      true,
    );
  });
});

describe("signature (Stripe-style t=,v1= form)", () => {
  it("builds the canonical signed payload as `${t}.${body}`", () => {
    expect(buildSignedPayload(NOW_MS, BODY)).toBe(`${NOW_MS}.${BODY}`);
  });

  it("formats `t=…,v1=…` headers and parses them back", () => {
    const digest = signSignedPayload(SECRET, NOW_MS, BODY);
    const header = formatStripeStyleHeader(NOW_MS, digest);
    expect(header).toBe(`t=${NOW_MS},v1=${digest}`);
    const parsed = parseSignatureHeader(header);
    expect(parsed?.timestampMs).toBe(NOW_MS);
    expect(parsed?.signatures).toEqual([digest]);
  });

  it("verifies a Stripe-style header against the original body", () => {
    const digest = signSignedPayload(SECRET, NOW_MS, BODY);
    const header = formatStripeStyleHeader(NOW_MS, digest);
    expect(verifySignature(SECRET, BODY, header)).toBe(true);
  });

  it("rejects a header where `t` was tampered after signing", () => {
    const digest = signSignedPayload(SECRET, NOW_MS, BODY);
    const tampered = formatStripeStyleHeader(NOW_MS + 1, digest);
    expect(verifySignature(SECRET, BODY, tampered)).toBe(false);
  });

  it("accepts multiple v1=… pairs (rotation friendly)", () => {
    const goodDigest = signSignedPayload(SECRET, NOW_MS, BODY);
    const badDigest = "0".repeat(goodDigest.length);
    const header = `t=${NOW_MS},v1=${badDigest},v1=${goodDigest}`;
    const parsed = parseSignatureHeader(header);
    expect(parsed?.signatures).toHaveLength(2);
    expect(verifySignature(SECRET, BODY, header)).toBe(true);
  });

  it("ignores forward-compatible unknown scheme versions", () => {
    const digest = signSignedPayload(SECRET, NOW_MS, BODY);
    const header = `t=${NOW_MS},v2=futurestuff,v1=${digest}`;
    expect(verifySignature(SECRET, BODY, header)).toBe(true);
  });

  it("parseSignatureHeader returns null on missing t or v1", () => {
    expect(parseSignatureHeader(`v1=${"0".repeat(64)}`)).toBeNull();
    expect(parseSignatureHeader(`t=${NOW_MS}`)).toBeNull();
    expect(parseSignatureHeader("")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("parseSignatureHeader rejects a non-numeric t", () => {
    expect(parseSignatureHeader(`t=NaN,v1=${"a".repeat(64)}`)).toBeNull();
  });
});

describe("signature (constant-time compare)", () => {
  it("constantTimeHexEqual is a thin wrapper around crypto.timingSafeEqual", () => {
    // Sanity check by source — the hardening pass requires that the
    // compare path uses `timingSafeEqual`, never `===`, never indexOf,
    // never a byte-by-byte JS loop. Read the actual file off disk and
    // assert the surface.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../signature.ts"), "utf8");
    expect(src).toContain("timingSafeEqual");
    // Critical: no `provided === expected` / `digest === expected` etc.
    // (We allow non-secret comparisons like `cidr.bits === 0` elsewhere,
    // but inside signature.ts the only `===` should be length / state
    // guards — never digest material.)
    expect(/\b(provided|expected|digest|candidate|sig|signature)\s*===/.test(src)).toBe(
      false,
    );
  });

  it("returns false for equal-prefix but different length", () => {
    expect(constantTimeHexEqual("abcdef", "abcdef00")).toBe(false);
  });

  it("returns false for the empty string vs empty string", () => {
    // Empty buffer would make timingSafeEqual unhappy; the wrapper
    // explicitly rejects this case.
    expect(constantTimeHexEqual("", "")).toBe(false);
  });

  it("returns true for byte-equal inputs in different case", () => {
    expect(constantTimeHexEqual("abcd", "ABCD")).toBe(true);
  });
});
