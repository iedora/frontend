'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from '@/components/upload/image-upload'
import { MenuRenderer } from '@/components/menu/menu-renderer'
import type { PublicMenu, PublicRestaurant } from '@/components/menu/types'
import {
  DEFAULT_THEME,
  FONTS,
  HEX_PATTERN,
  LAYOUTS,
  type ResolvedTheme,
} from '@/lib/menu-themes'
import { updateIdentity, updateTheme } from './actions'

type Identity = Pick<
  PublicRestaurant,
  'name' | 'description' | 'logoUrl' | 'bannerUrl'
>

export function ThemeEditor({
  slug,
  restaurant,
  menus,
  initialTheme,
}: {
  slug: string
  restaurant: PublicRestaurant
  menus: PublicMenu[]
  initialTheme: ResolvedTheme
}) {
  const router = useRouter()
  const initialIdentity: Identity = {
    name: restaurant.name,
    description: restaurant.description,
    logoUrl: restaurant.logoUrl,
    bannerUrl: restaurant.bannerUrl,
  }

  const [identity, setIdentity] = useState<Identity>(initialIdentity)
  const [theme, setTheme] = useState<ResolvedTheme>(initialTheme)

  const previewRestaurant: PublicRestaurant = { ...restaurant, ...identity }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-8">
        <IdentitySection
          slug={slug}
          restaurantId={restaurant.id}
          initial={initialIdentity}
          value={identity}
          onChange={setIdentity}
          onSaved={() => router.refresh()}
        />
        <Separator />
        <ThemeSection
          slug={slug}
          initial={initialTheme}
          value={theme}
          onChange={setTheme}
          onSaved={() => router.refresh()}
        />
      </div>

      <div className="lg:sticky lg:top-6 lg:h-fit">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Live preview
        </div>
        <div
          className="overflow-hidden rounded-lg border bg-background"
          data-testid="theme-preview"
          data-layout={theme.layout}
        >
          <MenuRenderer
            restaurant={previewRestaurant}
            menus={menus}
            theme={theme}
          />
        </div>
      </div>
    </div>
  )
}

function IdentitySection({
  slug,
  restaurantId,
  initial,
  value,
  onChange,
  onSaved,
}: {
  slug: string
  restaurantId: string
  initial: Identity
  value: Identity
  onChange: (next: Identity) => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Save button only tracks text fields. Logo/banner are persisted directly
  // by the ImageUpload component via lib/upload/actions, so they don't
  // contribute to the dirty state here.
  const dirty =
    value.name !== initial.name ||
    (value.description ?? '') !== (initial.description ?? '')

  const nameValid = value.name.trim().length > 0

  function patch<K extends keyof Identity>(key: K, v: Identity[K]) {
    onChange({ ...value, [key]: v })
    setSaved(false)
    setError(null)
  }

  function onSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateIdentity(slug, {
        name: value.name,
        description: value.description ?? '',
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
      onSaved()
    })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div>
        <h2 className="text-base font-medium">Identity</h2>
        <p className="text-xs text-muted-foreground">
          Name, copy, and brand assets shown at the top of the menu.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="identity-name">Restaurant name</Label>
        <Input
          id="identity-name"
          data-testid="identity-name"
          value={value.name}
          onChange={(e) => patch('name', e.target.value)}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="identity-description">Description</Label>
        <Textarea
          id="identity-description"
          data-testid="identity-description"
          value={value.description ?? ''}
          onChange={(e) => patch('description', e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="A short tagline shown under the name."
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <ImageUpload
          target={{ kind: 'restaurant-logo', restaurantId }}
          currentUrl={value.logoUrl}
          label="Logo"
          onChange={(url) => {
            patch('logoUrl', url)
            onSaved()
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Banner</Label>
        <ImageUpload
          target={{ kind: 'restaurant-banner', restaurantId }}
          currentUrl={value.bannerUrl}
          label="Banner"
          onChange={(url) => {
            patch('bannerUrl', url)
            onSaved()
          }}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={!dirty || !nameValid || pending}
          data-testid="identity-save"
        >
          {pending ? 'Saving…' : 'Save identity'}
        </Button>
        {saved && !dirty && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}

function ThemeSection({
  slug,
  initial,
  value,
  onChange,
  onSaved,
}: {
  slug: string
  initial: ResolvedTheme
  value: ResolvedTheme
  onChange: (next: ResolvedTheme) => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const dirty =
    value.layout !== initial.layout ||
    value.font !== initial.font ||
    value.primaryColor !== initial.primaryColor ||
    value.secondaryColor !== initial.secondaryColor

  const primaryValid = HEX_PATTERN.test(value.primaryColor)
  const secondaryValid = HEX_PATTERN.test(value.secondaryColor)
  const canSave = dirty && primaryValid && secondaryValid && !pending

  function patch<K extends keyof ResolvedTheme>(key: K, v: ResolvedTheme[K]) {
    onChange({ ...value, [key]: v })
    setSaved(false)
    setError(null)
  }

  function onSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateTheme(slug, value)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
      onSaved()
    })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div>
        <h2 className="text-base font-medium">Theme</h2>
        <p className="text-xs text-muted-foreground">
          Layout, fonts, and brand colors.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Layout</legend>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUTS.map((l) => {
            const selected = value.layout === l.id
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => patch('layout', l.id)}
                aria-pressed={selected}
                data-testid={`layout-${l.id}`}
                className={
                  'rounded-lg border p-3 text-left transition-colors ' +
                  (selected
                    ? 'border-primary bg-accent'
                    : 'border-border hover:bg-accent/50')
                }
              >
                <div className="text-sm font-medium">{l.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {l.description}
                </div>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="theme-font">Font</Label>
        <select
          id="theme-font"
          data-testid="theme-font"
          value={value.font}
          onChange={(e) => patch('font', e.target.value as ResolvedTheme['font'])}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <ColorField
        id="theme-primary"
        label="Primary color"
        hint="Headings and body text"
        value={value.primaryColor}
        valid={primaryValid}
        onChange={(v) => patch('primaryColor', v)}
      />
      <ColorField
        id="theme-secondary"
        label="Secondary color"
        hint="Descriptions, dividers, captions"
        value={value.secondaryColor}
        valid={secondaryValid}
        onChange={(v) => patch('secondaryColor', v)}
      />

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={!canSave} data-testid="theme-save">
          {pending ? 'Saving…' : 'Save theme'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onChange(DEFAULT_THEME)
            setSaved(false)
            setError(null)
          }}
          disabled={pending}
        >
          Reset to default
        </Button>
        {saved && !dirty && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}

function ColorField({
  id,
  label,
  hint,
  value,
  valid,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  valid: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
          aria-label={`${label} picker`}
        />
        <Input
          data-testid={`${id}-hex`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={'font-mono ' + (valid ? '' : 'border-destructive')}
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
