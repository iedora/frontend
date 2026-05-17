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
} from '@iedora/design-system'
import { createOrganizationAction } from './actions'

export function CreateOrganizationDialog() {
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
          New organization
        </Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · New organization">
        <DialogHeader>
          <DialogTitle>Create an organization</DialogTitle>
          <DialogDescription>
            Name is what members see. The slug becomes part of every URL.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const res = await createOrganizationAction(fd)
              if (res.ok) setOpen(false)
              else setError(res.error)
            })
          }}
        >
          <div style={{ display: 'grid', gap: 20 }}>
            <Field error={Boolean(error)}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldInput
                id="name"
                name="name"
                type="text"
                placeholder="Iedora Atelier"
                required
                minLength={2}
                maxLength={80}
              />
              <FieldHint>Two characters or more.</FieldHint>
            </Field>
            <Field error={Boolean(error)}>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <FieldInput
                id="slug"
                name="slug"
                type="text"
                placeholder="iedora-atelier"
                required
                pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
              />
              {error ? (
                <FieldHint role="alert">{error}</FieldHint>
              ) : (
                <FieldHint>
                  Lowercase letters / numbers / hyphens. 2–40 characters.
                </FieldHint>
              )}
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={pending} arrow>
              {pending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
