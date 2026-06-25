import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CheckIcon, ForkKnifeIcon, MapPinIcon, PlayIcon, QrCodeIcon, StarIcon } from '@phosphor-icons/react/ssr'
import { Button } from '@iedora/ui/components/ui/button'
import { Card, CardContent } from '@iedora/ui/components/ui/card'
import { signInUrl, signUpUrl } from '@iedora/product-menu/shared/auth-urls'
import { LangSwitch } from './lang-switch'
import { ThemeToggle } from '../../../../components/theme-toggle'
import { Accent, Container, CtaButton, SectionLabel, Tag } from '../../../../components/landing'

/**
 * Menu marketing landing. Same design language as the house page (/house):
 * editorial monospace section labels, hairline rules, shadcn Card + Button,
 * token colours (dark/light safe), compact copy. The restaurant motif lives in
 * the dotted menu leaders and the "Today's special" card.
 */

const SIGN_IN_HREF = signInUrl()
const SIGN_UP_HREF = signUpUrl()

type Dish = { name: string; price: string }
type Plan = { tier: string; price: string; per: string; badge?: string; cta: string; feats: string[] }
type FooterCol = { heading: string; links: string[] }

/** The dotted menu leader between a dish and its price. */
function Leader() {
  return <span className="h-px flex-1 self-center border-b border-dotted border-border" aria-hidden="true" />
}

/** iedora wordmark — fork-knife square + name. Shared by header + footer. */
function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ForkKnifeIcon size={17} weight="bold" />
      </span>
      <span className="font-heading text-[20px] font-extrabold tracking-[-0.02em] text-foreground">iedora</span>
    </span>
  )
}

export default async function LandingPage() {
  const t = await getTranslations('Landing')

  const dishes = t.raw('hero.dishes') as Dish[]
  const special = dishes[0]
  const rest = dishes.slice(1)
  const langs = t.raw('hero.langs') as string[]
  const features = t.raw('features.items') as string[]
  const steps = t.raw('how.steps') as { title: string; body: string }[]
  const bullets = t.raw('board.bullets') as string[]
  const onus = t.raw('pricing.onus') as Plan
  const kasa = t.raw('pricing.kasa') as Plan
  const worksWith = t.raw('worksWith') as string[]
  const footerCols = t.raw('footer.columns') as FooterCol[]
  const igHref = t('social.instagram')
  const ttHref = t('social.tiktok')

  return (
    <div className="min-h-screen bg-background text-foreground text-pretty [&_h1]:text-balance [&_h2]:text-balance [&_p]:text-balance [&_blockquote]:text-balance">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <Container className="flex h-14 items-center justify-between gap-3">
          <Link href="/menu" className="no-underline">
            <Logo />
          </Link>
          <ul className="ml-auto hidden items-center gap-7 lg:flex">
            {[
              { label: t('nav.features'), href: '#features' },
              { label: t('nav.how'), href: '#how' },
              { label: t('nav.pricing'), href: '#pricing' },
            ].map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-[14px] font-medium text-muted-foreground no-underline hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-2 lg:ml-7">
            <LangSwitch />
            <CtaButton href={SIGN_IN_HREF} variant="secondary">
              {t('nav.signIn')}
            </CtaButton>
          </div>
        </Container>
      </header>

      {/* Hero */}
      <section data-test-id="menu-hero">
        <Container className="grid gap-10 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <Accent underline>{t('hero.accent')}</Accent>
            <h1 className="mt-5 max-w-[15ch] font-heading text-[34px] font-extrabold leading-[1.04] tracking-[-0.02em] sm:text-[46px] lg:text-[56px]">
              {t('hero.headline')}
            </h1>
            <p className="mt-5 max-w-[44ch] text-[16px] leading-[1.55] text-muted-foreground sm:text-[18px]">
              {t('hero.subhead')}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <CtaButton href={SIGN_UP_HREF} full>
                {t('hero.ctaPrimary')}
              </CtaButton>
              <CtaButton href="#how" variant="secondary" full>
                <PlayIcon size={15} weight="fill" className="shrink-0" />
                {t('hero.ctaSecondary')}
              </CtaButton>
            </div>
            {/* Plays nicely with — real brand-coloured chips (fixed brand colours) */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="italic text-muted-foreground">{t('hero.worksWithLabel')}</span>
              <a
                href="https://www.thefork.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-foreground no-underline hover:border-primary/45"
              >
                <span className="grid size-4 shrink-0 place-items-center rounded bg-[#1fa76a] text-white">
                  <ForkKnifeIcon size={10} weight="bold" />
                </span>
                {worksWith[0]}
              </a>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-foreground no-underline hover:border-primary/45"
              >
                <MapPinIcon size={14} weight="fill" className="shrink-0 text-[#EA4335]" />
                {worksWith[1]}
              </a>
            </div>
          </div>

          {/* Menu card with Today's special */}
          <Card size="sm" className="w-full lg:max-w-md lg:justify-self-end">
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-[20px] font-extrabold">{t('hero.card.name')}</p>
                  <p className="truncate text-[12px] italic text-muted-foreground">{t('hero.card.note')}</p>
                </div>
                <Tag tone="primary">
                  <QrCodeIcon size={13} weight="bold" />
                  {t('hero.card.scan')}
                </Tag>
              </div>

              {special ? (
                <div className="mt-4 flex items-baseline gap-2 rounded-[12px] bg-amber-500/10 px-3 py-2.5">
                  <StarIcon size={15} weight="fill" className="shrink-0 self-center text-amber-500" />
                  <span className="text-[15px] font-bold">{special.name}</span>
                  <Leader />
                  <span className="text-[15px] font-bold tabular-nums">{special.price}</span>
                </div>
              ) : null}

              <ul className="mt-4 flex flex-col gap-3">
                {rest.map((d) => (
                  <li key={d.name} className="flex items-baseline gap-2 text-[15px]">
                    <span className="font-medium">{d.name}</span>
                    <Leader />
                    <span className="font-semibold tabular-nums text-muted-foreground">{d.price}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {langs.slice(0, 6).map((l) => (
                  <span
                    key={l}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </Container>
      </section>

      {/* 01 Features */}
      <section id="features" className="scroll-mt-16 bg-muted" data-test-id="menu-features">
        <Container className="py-12 sm:py-16">
          <SectionLabel index="01">{t('features.accent')}</SectionLabel>
          <h2 className="mt-4 font-heading text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
            {t('features.title')}
          </h2>
          <ul className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {features.map((name) => (
              <li key={name} className="flex items-center gap-3 border-b border-border py-2.5">
                <CheckIcon size={18} weight="bold" className="shrink-0 text-primary" />
                <span className="text-[15px] font-medium">{name}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 02 How */}
      <section id="how" className="scroll-mt-16" data-test-id="menu-how">
        <Container className="py-12 sm:py-16">
          <SectionLabel index="02">{t('how.accent')}</SectionLabel>
          <h2 className="mt-4 font-heading text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
            {t('how.title')}
          </h2>
          <ol className="mt-7 flex flex-col divide-y divide-border border-y border-border">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4 py-5">
                <span className="font-mono text-[14px] font-bold text-primary">{`0${i + 1}`}</span>
                <div className="min-w-0">
                  <h3 className="font-heading text-[18px] font-bold">{s.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-[1.5] text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Board (inverted band) */}
      <section className="bg-foreground text-background" data-test-id="menu-board">
        <Container className="py-12 text-center sm:py-16">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-background/60">
            {t('board.accent')}
          </span>
          <h2 className="mx-auto mt-3 max-w-[18ch] font-heading text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[34px]">
            {t('board.title')}
          </h2>
          <ul className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-4 gap-y-3 text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-[14.5px]">
                <CheckIcon size={16} weight="bold" className="shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 03 Pricing */}
      <section id="pricing" className="scroll-mt-16" data-test-id="menu-pricing">
        <Container className="py-12 sm:py-16">
          <SectionLabel index="03">{t('pricing.accent')}</SectionLabel>
          <h2 className="mt-4 font-heading text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[36px]">
            {t('pricing.title')}
          </h2>
          <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
            <PlanCard plan={onus} href={SIGN_UP_HREF} />
            <PlanCard plan={kasa} href={SIGN_UP_HREF} highlighted />
          </div>
        </Container>
      </section>

      {/* CTA band */}
      <section className="bg-primary text-primary-foreground" data-test-id="menu-cta">
        <Container className="flex flex-col items-center py-14 text-center sm:py-20">
          <h2 className="max-w-[18ch] font-heading text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
            {t('cta.title')}
          </h2>
          <p className="mt-3 max-w-[40ch] text-[16px] text-primary-foreground/90">{t('cta.subhead')}</p>
          <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button render={<a href={SIGN_UP_HREF} />} className="!w-full !justify-center !rounded-full !bg-primary-foreground !text-primary hover:!bg-primary-foreground/90 sm:!w-auto" nativeButton={false} size="lg">
              {t('cta.primary')}
            </Button>
            <Button
              render={<a href={SIGN_IN_HREF} />}
              nativeButton={false}
              variant="ghost"
              size="lg"
              className="!w-full !justify-center !rounded-full !border !border-primary-foreground/45 !text-primary-foreground hover:!bg-primary-foreground/10 hover:!text-primary-foreground sm:!w-auto"
            >
              {t('cta.secondary')}
            </Button>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <Container className="flex flex-col gap-6 py-10">
          <div className="flex flex-col gap-2.5">
            <Logo />
            <p className="text-[14px] text-muted-foreground">{t('footer.tagline')}</p>
            <p className="text-[12.5px] text-muted-foreground">{t('footer.langLine')}</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {footerCols.map((col) => (
              <div key={col.heading} className="flex flex-col gap-2.5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {col.heading}
                </p>
                {col.links.map((l) => (
                  <a key={l} href="#" className="text-[14px] text-foreground no-underline hover:text-primary">
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div className="flex items-center gap-3">
              <a
                href={igHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid size-9 place-items-center rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
                </svg>
              </a>
              <a
                href={ttHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="grid size-9 place-items-center rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M16.5 3c.35 2.4 1.9 4.05 4.5 4.3v3.05c-1.5.02-2.95-.45-4.2-1.32v6.05a5.85 5.85 0 1 1-5.85-5.85c.32 0 .63.03.94.08v3.16a2.75 2.75 0 1 0 1.86 2.6V3h2.75z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[12.5px] text-muted-foreground">{t('footer.copyright')}</p>
              <ThemeToggle />
            </div>
          </div>
        </Container>
      </footer>
    </div>
  )
}

function PlanCard({ plan, href, highlighted = false }: { plan: Plan; href: string; highlighted?: boolean }) {
  return (
    <Card size="sm" className={highlighted ? 'ring-2 ring-primary' : ''}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-[18px] font-extrabold">{plan.tier}</p>
          {plan.badge ? <Tag tone="special">{plan.badge}</Tag> : null}
        </div>
        <p className="flex items-baseline gap-1">
          <span className="font-heading text-[28px] font-extrabold tracking-[-0.02em]">{plan.price}</span>
          <span className="text-[13px] text-muted-foreground">{plan.per}</span>
        </p>
        <ul className="flex flex-1 flex-col gap-2">
          {plan.feats.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[13.5px]">
              <CheckIcon size={15} weight="bold" className="shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <CtaButton href={href} variant={highlighted ? 'default' : 'secondary'} full>
          {plan.cta}
        </CtaButton>
      </CardContent>
    </Card>
  )
}
