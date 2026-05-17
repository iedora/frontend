import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";

/**
 * SSRF guard for the webhook sender.
 *
 * Threat model: a malicious admin (or a misconfigured `/admin/webhooks`
 * register form) points a subscription URL at `http://internal-db:5432`,
 * `http://169.254.169.254/latest/meta-data/`, or any other private-network
 * address and uses the sender as a probe / exfil channel.
 *
 * Defence: before each delivery, resolve the URL's hostname (and
 * cross-check any bare-IP hostname) and reject if any resolved address
 * lives in a private / loopback / link-local / cloud-metadata range.
 *
 * Race-condition note (DNS rebinding): between the lookup and the fetch a
 * malicious DNS server could swap the resolved IP. We mitigate by:
 *   1. Doing exactly one lookup,
 *   2. Returning a custom `lookup` function to the HTTP agent that always
 *      yields the already-validated address — so the socket connects to
 *      the IP we vetted, not whatever DNS would return at fetch time.
 *
 * The `Host` header is left untouched, so TLS SNI + virtual hosts on the
 * resolved IP continue to work.
 *
 * Caveat: this still leaves a sub-millisecond window where a TTL-0
 * record could theoretically be raced inside the same Node lookup call.
 * Closing that fully requires `undici`'s `Dispatcher` API; we explicitly
 * chose the agent-level approach for v1 — it blocks the realistic attack
 * surface (form-submitted hostnames, static A-record rebinds) and avoids
 * a runtime dep.
 */

/** All ranges that MUST NOT be reached by the webhook sender. */
type Cidr = { family: 4 | 6; addr: string; bits: number };

const BLOCKED_V4: Cidr[] = [
  { family: 4, addr: "10.0.0.0", bits: 8 },
  { family: 4, addr: "172.16.0.0", bits: 12 },
  { family: 4, addr: "192.168.0.0", bits: 16 },
  { family: 4, addr: "127.0.0.0", bits: 8 },
  { family: 4, addr: "169.254.0.0", bits: 16 },
  { family: 4, addr: "100.64.0.0", bits: 10 },
  { family: 4, addr: "0.0.0.0", bits: 8 },
];

const BLOCKED_V6: Cidr[] = [
  { family: 6, addr: "::1", bits: 128 },
  { family: 6, addr: "fc00::", bits: 7 },
  { family: 6, addr: "fe80::", bits: 10 },
];

function ipv4ToInt(addr: string): number | null {
  const parts = addr.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    out = (out << 8) + n;
  }
  return out >>> 0;
}

function ipv4InCidr(addr: string, cidr: Cidr): boolean {
  const a = ipv4ToInt(addr);
  const b = ipv4ToInt(cidr.addr);
  if (a === null || b === null) return false;
  if (cidr.bits === 0) return true;
  const mask = cidr.bits === 32 ? 0xffffffff : (~((1 << (32 - cidr.bits)) - 1)) >>> 0;
  return (a & mask) === (b & mask);
}

function expandIpv6(addr: string): number[] | null {
  // Normalize "::ffff:10.0.0.1" to its v4-mapped form, then expand to 8x16-bit.
  let s = addr.toLowerCase().trim();
  // Strip IPv6 scope id ("fe80::1%eth0").
  const pct = s.indexOf("%");
  if (pct >= 0) s = s.slice(0, pct);
  if (!s.includes(":")) return null;

  // Handle embedded IPv4 (e.g. "::ffff:10.0.0.1" or "::1.2.3.4")
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = ipv4ToInt(tail);
    if (v4 === null) return null;
    const high = (v4 >>> 16) & 0xffff;
    const low = v4 & 0xffff;
    s = s.slice(0, lastColon + 1) + high.toString(16) + ":" + low.toString(16);
  }

  // Expand the "::" zero-run.
  const dcIdx = s.indexOf("::");
  let groups: string[];
  if (dcIdx >= 0) {
    const left = s.slice(0, dcIdx) === "" ? [] : s.slice(0, dcIdx).split(":");
    const right =
      s.slice(dcIdx + 2) === "" ? [] : s.slice(dcIdx + 2).split(":");
    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = s.split(":");
  }
  if (groups.length !== 8) return null;

  const out: number[] = [];
  for (const g of groups) {
    if (g.length === 0 || g.length > 4 || !/^[0-9a-f]+$/i.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out;
}

function ipv6InCidr(addr: string, cidr: Cidr): boolean {
  const a = expandIpv6(addr);
  const b = expandIpv6(cidr.addr);
  if (!a || !b) return false;
  let bits = cidr.bits;
  for (let i = 0; i < 8 && bits > 0; i++) {
    const take = Math.min(16, bits);
    const mask = take === 16 ? 0xffff : (~((1 << (16 - take)) - 1)) & 0xffff;
    if ((a[i]! & mask) !== (b[i]! & mask)) return false;
    bits -= take;
  }
  return true;
}

/**
 * Unmap an IPv4-mapped IPv6 address (`::ffff:a.b.c.d` or
 * `::ffff:hexhi:hexlo`) to its plain `a.b.c.d`. Returns null if it isn't a
 * mapped address.
 */
function unmapIpv4MappedIpv6(addr: string): string | null {
  const exp = expandIpv6(addr);
  if (!exp) return null;
  for (let i = 0; i < 5; i++) if (exp[i] !== 0) return null;
  if (exp[5] !== 0xffff) return null;
  const v4 = ((exp[6]! << 16) | exp[7]!) >>> 0;
  return [
    (v4 >>> 24) & 0xff,
    (v4 >>> 16) & 0xff,
    (v4 >>> 8) & 0xff,
    v4 & 0xff,
  ].join(".");
}

/**
 * True iff the given numeric IP (v4 or v6 string) is in a blocked range.
 * Handles IPv4-mapped IPv6 by re-checking against the v4 ranges.
 */
export function isBlockedIp(addr: string, family: 4 | 6): boolean {
  if (family === 4) {
    return BLOCKED_V4.some((c) => ipv4InCidr(addr, c));
  }
  // v6 — check v6 ranges, plus unmap-and-recheck for v4-mapped.
  if (BLOCKED_V6.some((c) => ipv6InCidr(addr, c))) return true;
  const unmapped = unmapIpv4MappedIpv6(addr);
  if (unmapped) return BLOCKED_V4.some((c) => ipv4InCidr(unmapped, c));
  return false;
}

/** Result of `validateWebhookUrl` — distinguishes the *why* for telemetry. */
export type SsrfValidation =
  | { ok: true; family: 4 | 6; address: string; hostname: string }
  | { ok: false; reason: string };

/**
 * Validate a webhook URL against the SSRF policy. Returns the resolved IP
 * address on success so the caller can pin the HTTP agent's `lookup`
 * function to that exact address (defence against DNS rebinding between
 * this check and the actual fetch).
 */
export async function validateWebhookUrl(
  rawUrl: string,
  opts: { allowPrivateNetworks?: boolean } = {},
): Promise<SsrfValidation> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: `unsupported protocol ${parsed.protocol}` };
  }
  const rawHostname = parsed.hostname;
  if (!rawHostname) return { ok: false, reason: "empty hostname" };
  // URL parser keeps IPv6 brackets in `hostname` (`[::1]`); strip for
  // both the bare-IP literal check and the DNS lookup.
  const hostname =
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname;

  // Dev-only escape hatch: when explicitly allowed, skip the DNS check
  // entirely. Local hostnames like `localhost.local` or `*.test` don't
  // resolve in CI, and the caller has opted to trust their input here.
  // Protocol guard above still ran.
  if (opts.allowPrivateNetworks) {
    return { ok: true, family: 4, address: hostname, hostname };
  }

  // Defence-in-depth: if the hostname itself parsed as an IP, reject
  // before even resolving — that way a custom DNS lookup can't return
  // something benign for an explicitly private literal input.
  if (looksLikeIpv4(hostname) && isBlockedIp(hostname, 4)) {
    return { ok: false, reason: `blocked literal ipv4 ${hostname}` };
  }
  if (looksLikeIpv6(hostname) && isBlockedIp(hostname, 6)) {
    return { ok: false, reason: `blocked literal ipv6 ${hostname}` };
  }

  let resolved: LookupAddress;
  try {
    resolved = await lookup(hostname, { verbatim: true });
  } catch {
    return { ok: false, reason: "dns lookup failed" };
  }
  const family = resolved.family === 6 ? 6 : 4;

  if (isBlockedIp(resolved.address, family)) {
    return {
      ok: false,
      reason: `blocked ${family === 4 ? "ipv4" : "ipv6"} ${resolved.address}`,
    };
  }

  return { ok: true, family, address: resolved.address, hostname };
}

function looksLikeIpv4(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(s);
}

function looksLikeIpv6(s: string): boolean {
  return s.includes(":") && !s.includes("/");
}

/**
 * Build an `http.Agent` / `https.Agent` pair whose `lookup` is pinned to
 * the already-validated address. Pass the right one to `fetch` via the
 * `dispatcher` / `agent` option (or merge into a custom `undici` dispatch
 * if the host product wants finer control).
 *
 * The pinned lookup means that even if the global DNS resolver swaps the
 * record between `validateWebhookUrl` and the fetch, the socket still
 * connects to the IP we vetted.
 */
export function makePinnedAgent(
  family: 4 | 6,
  address: string,
): { http: HttpAgent; https: HttpsAgent } {
  const pinnedLookup = (
    _hostname: string,
    _opts: unknown,
    cb: (
      err: NodeJS.ErrnoException | null,
      addr: string,
      fam: number,
    ) => void,
  ) => {
    cb(null, address, family);
  };
  // The Node typings for the agent options' `lookup` are a touch loose;
  // a single cast keeps the surface honest.
  const agentOpts = { lookup: pinnedLookup, keepAlive: false } as unknown as ConstructorParameters<typeof HttpAgent>[0];
  return {
    http: new HttpAgent(agentOpts),
    https: new HttpsAgent(agentOpts),
  };
}
