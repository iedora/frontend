'use client'

import { useState, useTransition } from 'react'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldHint,
  FieldInput,
  FieldLabel,
  FieldTextarea,
} from '@iedora/design-system'
import { updateApplicationAction } from './actions'
import { deleteApplicationAction } from '../actions'
import { KNOWN_SCOPES } from '../_scopes'

export function SecretReveal({ secret }: { secret: string | null }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!secret) {
    return (
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-55)',
        }}
      >
        — no secret (public client)
      </span>
    )
  }

  const masked = '•'.repeat(Math.min(28, secret.length))

  return (
    <span
      style={{
        display: 'inline-flex',
        gap: 12,
        alignItems: 'center',
        fontFamily: 'var(--mono)',
        fontSize: 12,
      }}
    >
      <span style={{ color: revealed ? 'var(--ink)' : 'var(--ink-55)' }}>
        {revealed ? secret : masked}
      </span>
      <Button variant="ghost" onClick={() => setRevealed((v) => !v)}>
        {revealed ? 'Hide' : 'Reveal'}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(secret).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            })
          }
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </span>
  )
}

export function ApplicationForm({
  internalId,
  initialName,
  initialRedirectUris,
  initialScopes,
}: {
  internalId: string
  initialName: string
  initialRedirectUris: string[]
  initialScopes: string[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const initialScopeSet = new Set(initialScopes)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        setOk(false)
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
          const res = await updateApplicationAction(internalId, fd)
          if (res.ok) setOk(true)
          else setError(res.error)
        })
      }}
      style={{ display: 'grid', gap: 20, maxWidth: 720 }}
    >
      <Field error={Boolean(error)}>
        <FieldLabel htmlFor="client_name">Name</FieldLabel>
        <FieldInput
          id="client_name"
          name="client_name"
          type="text"
          defaultValue={initialName}
          required
        />
        <FieldHint>Shown on the consent screen.</FieldHint>
      </Field>
      <Field error={Boolean(error)}>
        <FieldLabel htmlFor="redirect_uris">Redirect URIs</FieldLabel>
        <FieldTextarea
          id="redirect_uris"
          name="redirect_uris"
          rows={4}
          defaultValue={initialRedirectUris.join('\n')}
          required
          style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
        />
        <FieldHint>One per line.</FieldHint>
      </Field>
      <Field>
        <FieldLabel>Scope</FieldLabel>
        <div
          role="group"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 18px',
            marginTop: 6,
          }}
        >
          {KNOWN_SCOPES.map((s) => (
            <label
              key={s}
              style={{
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
                fontFamily: 'var(--mono)',
                fontSize: 12,
              }}
            >
              <input
                type="checkbox"
                name="scope"
                value={s}
                defaultChecked={initialScopeSet.has(s)}
              />
              {s}
            </label>
          ))}
        </div>
        {error ? (
          <FieldHint role="alert">{error}</FieldHint>
        ) : ok ? (
          <FieldHint>Saved.</FieldHint>
        ) : (
          <FieldHint>What this client may request.</FieldHint>
        )}
      </Field>
      <div>
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

export function DeleteApplicationDialog({
  internalId,
  name,
}: {
  internalId: string
  name: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Delete</Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Delete application">
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            Tokens and consents for this client are invalidated by the FK
            cascade. The client_secret is gone — re-registration mints new
            credentials.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            style={{
              color: 'var(--cinnabar)',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
            }}
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="accent"
            disabled={pending}
            onClick={() => {
              setError(null)
              startTransition(async () => {
                const res = await deleteApplicationAction(internalId)
                if (res && 'ok' in res && res.ok === false) {
                  setError(res.error)
                }
              })
            }}
          >
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
