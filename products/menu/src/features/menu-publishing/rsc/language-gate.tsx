'use client'

import * as React from 'react'
import { useState } from 'react'

/**
 * Guest language gate (Pencil "Guest · Language gate"). Shown before the
 * menu the first time a diner lands on a multi-language restaurant with
 * no explicit `?lang=` choice. Picking a language sets a per-restaurant
 * cookie and reloads the menu in that language; the cookie keeps the gate
 * from re-appearing on later visits. Themed by the restaurant's primary
 * colour, same as the menu templates.
 */

const WELCOME: Record<string, string> = {
  en: 'Welcome',
  pt: 'Bem-vindo',
  es: 'Bienvenido',
  fr: 'Bienvenue',
}
const NATIVE: Record<string, string> = {
  en: 'English',
  pt: 'Português',
  es: 'Español',
  fr: 'Français',
}
const CHOOSE: Record<string, string> = {
  en: 'Choose your language',
  pt: 'Escolha o seu idioma',
  es: 'Elige tu idioma',
  fr: 'Choisissez votre langue',
}
const VIEW: Record<string, string> = {
  en: 'View menu',
  pt: 'Ver menu',
  es: 'Ver menú',
  fr: 'Voir le menu',
}

function Cutlery() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" />
      <path d="m2.1 21.8 6.4-6.3" />
      <path d="m19 5-7 7" />
    </svg>
  )
}
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function LanguageGate({
  slug,
  restaurantName,
  logoUrl,
  primaryColor,
  languages,
  current,
}: {
  slug: string
  restaurantName: string
  logoUrl?: string | null
  primaryColor: string
  languages: string[]
  current: string
}) {
  const [sel, setSel] = useState(current)
  const welcome = languages
    .slice(0, 3)
    .map((c) => WELCOME[c] ?? c)
    .join('  ·  ')

  function go() {
    document.cookie = `iedora_lang_${slug}=${sel}; path=/; max-age=31536000; samesite=lax`
    window.location.assign(`?lang=${sel}`)
  }

  return (
    <main
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 py-10"
      style={{ ['--gate' as string]: primaryColor } as React.CSSProperties}
      data-testid="language-gate"
    >
      <div className="flex flex-1 flex-col items-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl text-white"
            style={{ background: 'var(--gate)' }}
          >
            <Cutlery />
          </div>
        )}
        <h1
          className="mt-4 text-center text-[22px] font-bold"
          style={{ fontFamily: 'var(--display)' }}
        >
          {restaurantName}
        </h1>
        <p className="mt-1 text-center text-[13px] text-[#80756b]">{welcome}</p>

        <p className="mb-3 mt-9 text-center text-[15px] font-semibold">
          {CHOOSE[current] ?? CHOOSE.en}
        </p>
        <ul className="w-full space-y-2.5">
          {languages.map((code) => {
            const selected = code === sel
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => setSel(code)}
                  aria-pressed={selected}
                  data-testid={`gate-lang-${code}`}
                  className="flex w-full items-center justify-between rounded-[16px] border-2 bg-white px-4 py-3.5 text-[15px] font-medium transition-colors"
                  style={{ borderColor: selected ? 'var(--gate)' : '#ECE4DA' }}
                >
                  <span>{NATIVE[code] ?? code}</span>
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full border-2"
                    style={{
                      borderColor: selected ? 'var(--gate)' : '#D8CFC4',
                      background: selected ? 'var(--gate)' : 'transparent',
                    }}
                  >
                    {selected && <Check />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={go}
        data-testid="gate-submit"
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full py-4 text-[16px] font-semibold text-white"
        style={{ background: 'var(--gate)' }}
      >
        {VIEW[sel] ?? VIEW.en}
        <span aria-hidden="true">→</span>
      </button>
    </main>
  )
}
