'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { registerApplicationAction } from './actions'
import { KNOWN_SCOPES } from './_scopes'

export function RegisterApplicationDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="solid" arrow>
          Register application
        </Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Register OAuth client">
        <DialogHeader>
          <DialogTitle>Register an OAuth client</DialogTitle>
          <DialogDescription>
            Issues a fresh <code>client_id</code> and <code>client_secret</code>.
            Pin the secret straight away — it’s shown once on the next page.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const res = await registerApplicationAction(fd)
              if (res.ok) {
                setOpen(false)
                router.push(
                  res.internalId
                    ? `/admin/applications/${res.internalId}`
                    : '/admin/applications',
                )
                router.refresh()
              } else {
                setError(res.error)
              }
            })
          }}
        >
          <div style={{ display: 'grid', gap: 20 }}>
            <Field error={Boolean(error)}>
              <FieldLabel htmlFor="client_name">Name</FieldLabel>
              <FieldInput
                id="client_name"
                name="client_name"
                type="text"
                placeholder="Acme dashboard"
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
                placeholder={'https://app.example.com/api/auth/callback\nhttps://localhost:3000/api/auth/callback'}
                required
                style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
              />
              <FieldHint>One per line. Absolute URLs only.</FieldHint>
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
                      letterSpacing: '0.04em',
                    }}
                  >
                    <input
                      type="checkbox"
                      name="scope"
                      value={s}
                      defaultChecked={
                        s === 'openid' || s === 'profile' || s === 'email'
                      }
                    />
                    {s}
                  </label>
                ))}
              </div>
              {error ? (
                <FieldHint role="alert">{error}</FieldHint>
              ) : (
                <FieldHint>Pick what the client may request.</FieldHint>
              )}
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent" arrow disabled={pending}>
              {pending ? 'Registering…' : 'Register'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
