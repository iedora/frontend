import { describe, expect, it, vi } from "vitest";
import { isBlockedIp, validateWebhookUrl } from "../ssrf";

// We test `isBlockedIp` directly for the pure boundary cases (no DNS),
// and `validateWebhookUrl` via a mocked `node:dns/promises` lookup for
// the integration path (protocol guard, IPv4-mapped IPv6 unmapping,
// public allow).

vi.mock("node:dns/promises", () => {
  return {
    lookup: async (hostname: string) => {
      const map: Record<string, { address: string; family: number }> = {
        localhost: { address: "127.0.0.1", family: 4 },
        "metadata.example": { address: "169.254.169.254", family: 4 },
        "internal.example": { address: "10.0.0.5", family: 4 },
        "private-172.example": { address: "172.16.0.1", family: 4 },
        "edge-172.example": { address: "172.15.255.254", family: 4 }, // NOT in 172.16/12
        "private-192.example": { address: "192.168.1.1", family: 4 },
        "cgnat.example": { address: "100.64.1.1", family: 4 },
        "linklocal.example": { address: "169.254.1.1", family: 4 },
        "loopback6.example": { address: "::1", family: 6 },
        "mapped.example": { address: "::ffff:10.0.0.1", family: 6 },
        "ula.example": { address: "fc00::1", family: 6 },
        "ll6.example": { address: "fe80::1", family: 6 },
        "public.example": { address: "93.184.216.34", family: 4 },
        "public6.example": {
          address: "2606:2800:220:1:248:1893:25c8:1946",
          family: 6,
        },
      };
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        return { address: hostname, family: 4 };
      }
      if (hostname.includes(":")) {
        return { address: hostname, family: 6 };
      }
      const entry = map[hostname];
      if (!entry) {
        throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
      }
      return entry;
    },
  };
});

describe("isBlockedIp (pure boundary cases)", () => {
  it("blocks 10.0.0.0/8", () => {
    expect(isBlockedIp("10.0.0.1", 4)).toBe(true);
    expect(isBlockedIp("10.255.255.255", 4)).toBe(true);
    expect(isBlockedIp("11.0.0.1", 4)).toBe(false);
  });

  it("blocks 172.16.0.0/12 — boundary check at 172.15.x", () => {
    expect(isBlockedIp("172.16.0.0", 4)).toBe(true);
    expect(isBlockedIp("172.31.255.255", 4)).toBe(true);
    expect(isBlockedIp("172.32.0.0", 4)).toBe(false);
    // 172.15.x is NOT in 172.16/12 — the famous off-by-one boundary.
    expect(isBlockedIp("172.15.255.254", 4)).toBe(false);
  });

  it("blocks 192.168.0.0/16", () => {
    expect(isBlockedIp("192.168.0.1", 4)).toBe(true);
    expect(isBlockedIp("192.169.0.1", 4)).toBe(false);
  });

  it("blocks 127.0.0.0/8 (loopback v4)", () => {
    expect(isBlockedIp("127.0.0.1", 4)).toBe(true);
    expect(isBlockedIp("127.255.255.255", 4)).toBe(true);
  });

  it("blocks 169.254.0.0/16 (link-local + cloud metadata)", () => {
    expect(isBlockedIp("169.254.0.0", 4)).toBe(true);
    expect(isBlockedIp("169.254.169.254", 4)).toBe(true);
    expect(isBlockedIp("169.255.0.0", 4)).toBe(false);
  });

  it("blocks 100.64.0.0/10 (CGNAT)", () => {
    expect(isBlockedIp("100.64.0.1", 4)).toBe(true);
    expect(isBlockedIp("100.127.255.255", 4)).toBe(true);
    expect(isBlockedIp("100.128.0.0", 4)).toBe(false);
    expect(isBlockedIp("100.63.255.255", 4)).toBe(false);
  });

  it("blocks ::1 (loopback v6)", () => {
    expect(isBlockedIp("::1", 6)).toBe(true);
    expect(isBlockedIp("::2", 6)).toBe(false);
  });

  it("blocks fc00::/7 (unique-local v6)", () => {
    expect(isBlockedIp("fc00::1", 6)).toBe(true);
    expect(isBlockedIp("fdff::1", 6)).toBe(true);
    expect(isBlockedIp("fe00::1", 6)).toBe(false);
  });

  it("blocks fe80::/10 (link-local v6)", () => {
    expect(isBlockedIp("fe80::1", 6)).toBe(true);
    expect(isBlockedIp("febf:ffff::1", 6)).toBe(true);
    expect(isBlockedIp("fec0::1", 6)).toBe(false);
  });

  it("unmaps ::ffff:a.b.c.d and re-checks against v4 ranges", () => {
    expect(isBlockedIp("::ffff:10.0.0.1", 6)).toBe(true);
    expect(isBlockedIp("::ffff:127.0.0.1", 6)).toBe(true);
    expect(isBlockedIp("::ffff:169.254.169.254", 6)).toBe(true);
    expect(isBlockedIp("::ffff:8.8.8.8", 6)).toBe(false);
  });
});

describe("validateWebhookUrl", () => {
  it("rejects a private 10.x address", async () => {
    const r = await validateWebhookUrl("http://internal.example/hook");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/blocked ipv4 10\.0\.0\.5/);
  });

  it("rejects 172.16.x (and allows 172.15.x at the boundary)", async () => {
    const blocked = await validateWebhookUrl("http://private-172.example/h");
    expect(blocked.ok).toBe(false);

    const allowed = await validateWebhookUrl("http://edge-172.example/h");
    expect(allowed.ok).toBe(true);
  });

  it("rejects 169.254.169.254 (AWS/GCP metadata)", async () => {
    const r = await validateWebhookUrl("http://metadata.example/latest/meta-data/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/169\.254\.169\.254/);
  });

  it("rejects 192.168.x", async () => {
    const r = await validateWebhookUrl("http://private-192.example/h");
    expect(r.ok).toBe(false);
  });

  it("rejects 100.64.x (CGNAT)", async () => {
    const r = await validateWebhookUrl("http://cgnat.example/h");
    expect(r.ok).toBe(false);
  });

  it("rejects `localhost` (resolves to 127.0.0.1)", async () => {
    const r = await validateWebhookUrl("http://localhost/h");
    expect(r.ok).toBe(false);
  });

  it("rejects ::1 (v6 loopback)", async () => {
    const r = await validateWebhookUrl("http://[::1]/h");
    expect(r.ok).toBe(false);
  });

  it("rejects IPv4-mapped IPv6 (::ffff:10.0.0.1)", async () => {
    const r = await validateWebhookUrl("http://mapped.example/h");
    expect(r.ok).toBe(false);
  });

  it("rejects fc00::/7 (unique-local v6)", async () => {
    const r = await validateWebhookUrl("http://ula.example/h");
    expect(r.ok).toBe(false);
  });

  it("rejects fe80::/10 (link-local v6)", async () => {
    const r = await validateWebhookUrl("http://ll6.example/h");
    expect(r.ok).toBe(false);
  });

  it("rejects `file://` and other non-http(s) protocols", async () => {
    const r = await validateWebhookUrl("file:///etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unsupported protocol/);

    const g = await validateWebhookUrl("gopher://example.com/");
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.reason).toMatch(/unsupported protocol/);

    const f = await validateWebhookUrl("ftp://example.com/file");
    expect(f.ok).toBe(false);
  });

  it("allows a public IPv4 address", async () => {
    const r = await validateWebhookUrl("https://public.example/h");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.family).toBe(4);
      expect(r.address).toBe("93.184.216.34");
    }
  });

  it("allows a public IPv6 address", async () => {
    const r = await validateWebhookUrl("https://public6.example/h");
    expect(r.ok).toBe(true);
  });

  it("rejects URL-literal private IPs even before DNS would resolve", async () => {
    // `dns.lookup` short-circuits IP literals; validateWebhookUrl ALSO
    // re-checks the URL-literal form so a custom resolver can never
    // sneak a private IP through.
    const r = await validateWebhookUrl("http://10.0.0.1/h");
    expect(r.ok).toBe(false);
  });

  it("allows private networks when explicitly opted in (dev/test only)", async () => {
    const r = await validateWebhookUrl("http://localhost/h", {
      allowPrivateNetworks: true,
    });
    expect(r.ok).toBe(true);
  });

  it("still rejects non-http(s) protocols even with allowPrivateNetworks", async () => {
    const r = await validateWebhookUrl("file:///etc/passwd", {
      allowPrivateNetworks: true,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unresolvable hostnames", async () => {
    const r = await validateWebhookUrl("http://does-not-exist.example/h");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/dns lookup failed/);
  });
});
