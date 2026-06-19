import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CreditCard,
  ImageIcon,
  Languages,
  QrCode,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@iedora/design-system";
import { signInUrl, signUpUrl } from "@iedora/product-menu/shared/auth-urls";

/**
 * iedora menu — marketing landing (Pencil "warm-light, appetizing" redesign).
 * Hero → Features → How it works → Showcase → Pricing → Testimonial → CTA → Footer.
 * Static server component; copy is EN for now (i18n to follow).
 */

const SIGN_IN_HREF = signInUrl();
const SIGN_UP_HREF = signUpUrl();

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
];

const FEATURES = [
  { Icon: QrCode, title: "Scan & go", body: "Guests scan a QR code or tap a link and your menu opens instantly — no app to download, ever." },
  { Icon: Zap, title: "Edit in seconds", body: "Change a price, mark a dish sold out, or launch a daily special from your phone — live immediately." },
  { Icon: ImageIcon, title: "Photo-rich items", body: "Show every dish with mouth-watering photos, clear descriptions, allergens, and prices." },
  { Icon: Languages, title: "Instant translations", body: "Serve every guest in their language with automatic, fully editable menu translations." },
  { Icon: BarChart3, title: "Know what sells", body: "See views, taps, and favorites, then feature your best-performing dishes front and center." },
  { Icon: CreditCard, title: "Order & pay", body: "Let guests order and pay from the table, with tickets sent straight to your kitchen." },
];

const STEPS = [
  { n: "1", title: "Build your menu", body: "Add dishes, photos, and prices — or import your existing menu in one click and organize sections in minutes." },
  { n: "2", title: "Place your QR", body: "We generate a branded QR code and short link. Put it on tables, the door, or your receipts." },
  { n: "3", title: "Go live & update", body: "Guests scan and browse instantly. Change prices or launch specials anytime — updates appear right away." },
];

const SHOWCASE_BULLETS = [
  "No reprinting costs — ever",
  "Change prices and specials in real time",
  "Multi-language menus out of the box",
  "Works on every phone, with no app",
];

const PRICING = {
  free: {
    tier: "Free",
    price: "€0",
    sub: "forever",
    desc: "For a single menu",
    feats: ["1,000 menu views / month", "One restaurant", "QR code & short link", "Basic view analytics"],
    cta: "Get started free",
  },
  pro: {
    tier: "Pro",
    price: "€12",
    sub: "/ year",
    desc: "For growing restaurants",
    feats: ["Unlimited menu views", "Unlimited restaurants", "Photos & instant translations", "Full analytics", "Order & pay at the table"],
    cta: "Start free trial",
    badge: "Best value",
  },
};

const FOOTER = [
  { heading: "Product", links: ["Features", "Pricing", "Stories", "Analytics"] },
  { heading: "Company", links: ["About", "Careers", "Contact"] },
  { heading: "Resources", links: ["Help center", "Guides", "Developer API"] },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--cinnabar-soft)] px-3 py-1.5 text-[13px] font-semibold text-[var(--cinnabar)]">
      {children}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
          <Link href="/menu" className="flex items-center gap-2 no-underline">
            <span className="grid size-8 place-items-center rounded-lg bg-primary font-[family-name:var(--display)] text-[18px] font-extrabold text-white">i</span>
            <span className="font-[family-name:var(--display)] text-[21px] font-extrabold tracking-[-0.02em] text-foreground">iedora</span>
          </Link>
          <ul className="ml-6 hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-[15px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground">{l.label}</a>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-3">
            <Button as="a" href={SIGN_IN_HREF} variant="ghost" size="sm">Sign in</Button>
            <Button as="a" href={SIGN_UP_HREF} variant="primary" size="sm">Get started free</Button>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>Digital menus for restaurants</Eyebrow>
            <h1 className="text-[40px] leading-[1.05] md:text-[56px]">
              Your menu, beautifully digital — <span className="text-primary">live in minutes.</span>
            </h1>
            <p className="max-w-xl text-[17px] leading-[1.6] text-muted-foreground">
              iedora turns your menu into a stunning, always-up-to-date digital experience your guests scan,
              browse, and order from — no app, no printing, no reprints.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button as="a" href={SIGN_UP_HREF} variant="primary" size="lg" arrow>Get started free</Button>
              <Button as="a" href="#how" variant="secondary" size="lg">Watch demo</Button>
            </div>
            <p className="text-[14px] text-muted-foreground">
              No app to download · Free 14-day trial · Cancel anytime
            </p>
          </div>
          <PhoneMock />
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <SectionHead eyebrow="Everything in one place" title="A menu that works as hard as you do" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-[var(--cinnabar-soft)] text-primary">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <h3 className="text-[17px]">{title}</h3>
                <p className="text-[14.5px] leading-[1.55] text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section id="how" className="bg-muted/60 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHead eyebrow="Up and running today" title="Live in three simple steps" />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ n, title, body }) => (
                <div key={n} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-7">
                  <span className="grid size-10 place-items-center rounded-full bg-primary font-[family-name:var(--display)] text-[16px] font-bold text-white">{n}</span>
                  <h3 className="mt-1 text-[18px]">{title}</h3>
                  <p className="text-[14.5px] leading-[1.55] text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Showcase ──────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col items-start gap-5">
            <Eyebrow>Built for busy restaurants</Eyebrow>
            <h2 className="text-[34px] leading-[1.1] md:text-[42px]">Update once. Everywhere, instantly.</h2>
            <p className="text-[16px] leading-[1.6] text-muted-foreground">
              Your menu lives in one place and reflects every change the moment you make it — no reprints,
              no out-of-date PDFs, no waiting on an agency.
            </p>
            <ul className="flex flex-col gap-3">
              {SHOWCASE_BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-[15.5px]">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--green-soft)] text-[var(--green)]"><Check size={15} strokeWidth={2.5} /></span>
                  {b}
                </li>
              ))}
            </ul>
            <Button as="a" href={SIGN_UP_HREF} variant="primary" arrow>Start free trial</Button>
          </div>
          <PhoneMock variant="grid" />
        </section>

        {/* ── Pricing ───────────────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <SectionHead eyebrow="Simple pricing" title="Plans that grow with you" sub="Start free, upgrade when you're ready. No setup fees, cancel anytime." />
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            <PlanCard plan={PRICING.free} href={SIGN_UP_HREF} />
            <PlanCard plan={PRICING.pro} href={SIGN_UP_HREF} highlighted />
          </div>
        </section>

        {/* ── Testimonial ───────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
          <div className="mb-4 flex justify-center gap-1 text-primary">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}
          </div>
          <blockquote className="font-[family-name:var(--display)] text-[24px] font-medium leading-[1.4] text-foreground md:text-[28px]">
            “We set up our whole menu in an afternoon. Updating specials used to mean reprinting everything —
            now it takes ten seconds from my phone, and guests love the photos.”
          </blockquote>
          <p className="mt-5 text-[15px] text-muted-foreground">Owner, Café Verde</p>
        </section>

        {/* ── CTA band ──────────────────────────────────────── */}
        <section className="px-6 pb-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-[28px] bg-[var(--ink)] px-8 py-16 text-center text-[var(--paper)]">
            <h2 className="text-[32px] leading-[1.1] text-[var(--paper)] md:text-[40px]">Ready to bring your menu to life?</h2>
            <p className="max-w-xl text-[16px] leading-[1.6] text-[var(--paper)]/75">
              Join 1,200+ restaurants serving smarter with iedora. Free to start — no card required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button as="a" href={SIGN_UP_HREF} variant="primary" size="lg" arrow>Get started</Button>
              <Button as="a" href={SIGN_IN_HREF} variant="ghost" size="lg" className="!text-[var(--paper)] !border-[color-mix(in_srgb,var(--paper)_30%,transparent)]">Book a demo</Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary font-[family-name:var(--display)] text-[15px] font-extrabold text-white">i</span>
              <span className="font-[family-name:var(--display)] text-[18px] font-extrabold text-foreground">iedora</span>
            </div>
            <p className="max-w-xs text-[14px] leading-[1.55] text-muted-foreground">
              Beautiful digital menus that keep your guests coming back.
            </p>
          </div>
          {FOOTER.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <p className="font-[family-name:var(--display)] text-[13px] font-bold tracking-[0.04em] text-foreground">{col.heading}</p>
              {col.links.map((l) => (
                <a key={l} href="#" className="text-[14px] text-muted-foreground no-underline transition-colors hover:text-foreground">{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-6xl px-6 py-5 text-[13px] text-muted-foreground">© 2026 iedora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="max-w-2xl text-[32px] leading-[1.12] md:text-[40px]">{title}</h2>
      {sub ? <p className="max-w-xl text-[16px] leading-[1.55] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function PlanCard({
  plan,
  href,
  highlighted = false,
}: {
  plan: { tier: string; price: string; sub: string; desc: string; feats: string[]; cta: string; badge?: string };
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`relative flex flex-col gap-5 rounded-2xl border bg-card p-7 ${highlighted ? "border-primary shadow-[0_18px_44px_-18px_var(--cinnabar-16)]" : "border-border"}`}>
      {plan.badge ? (
        <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[12px] font-semibold text-white">{plan.badge}</span>
      ) : null}
      <div>
        <p className="font-[family-name:var(--display)] text-[17px] font-bold text-foreground">{plan.tier}</p>
        <p className="text-[13px] text-muted-foreground">{plan.desc}</p>
      </div>
      <p className="flex items-baseline gap-1">
        <span className="font-[family-name:var(--display)] text-[40px] font-extrabold tracking-[-0.02em] text-foreground">{plan.price}</span>
        <span className="text-[15px] text-muted-foreground">{plan.sub}</span>
      </p>
      <Button as="a" href={href} variant={highlighted ? "primary" : "secondary"} className="!w-full !justify-center">{plan.cta}</Button>
      <ul className="flex flex-col gap-2.5">
        {plan.feats.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-[14.5px]">
            <Check size={16} strokeWidth={2.5} className="shrink-0 text-[var(--green)]" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lightweight phone mockup echoing the Pencil Menu Preview. */
function PhoneMock({ variant = "list" }: { variant?: "list" | "grid" }) {
  const items = [
    { name: "Margherita", desc: "San Marzano tomato, mozzarella, basil", price: "€9.50" },
    { name: "Diavola", desc: "Spicy salami, mozzarella, chilli", price: "€12.00" },
    { name: "Marinara", desc: "Tomato, garlic, oregano", price: "€8.50" },
  ];
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_70px_-24px_var(--ink-22)]">
        <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-semibold text-foreground">
          <span>9:41</span>
          <span className="text-muted-foreground">●●●</span>
        </div>
        <div className="flex flex-col gap-3.5 px-4 pb-5 pt-3">
          <div>
            <p className="font-[family-name:var(--display)] text-[18px] font-extrabold text-foreground">La Trattoria</p>
            <p className="text-[11px] text-muted-foreground">Family-run trattoria · wood-fired classics</p>
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-[var(--brand-foreground)]">Pizzas</span>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">Drinks</span>
          </div>
          <div className={variant === "grid" ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-3"}>
            {items.map((it) => (
              <div key={it.name} className={variant === "grid" ? "rounded-xl border border-border p-2.5" : "flex items-center gap-3"}>
                {variant === "list" ? <span className="size-12 shrink-0 rounded-lg bg-muted" /> : <span className="mb-2 block h-16 rounded-lg bg-muted" />}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-foreground">{it.name}</p>
                  {variant === "list" ? <p className="truncate text-[11px] text-muted-foreground">{it.desc}</p> : null}
                  <p className="text-[12px] font-semibold text-foreground">{it.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
