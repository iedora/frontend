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
import {
  cancelInvitationAction,
  deleteOrganizationAction,
  inviteMemberAction,
  removeMemberAction,
  updateOrganizationAction,
} from './actions'

export function IdentityForm({
  organizationId,
  initialName,
  initialSlug,
}: {
  organizationId: string
  initialName: string
  initialSlug: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        setOk(false)
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
          const res = await updateOrganizationAction(organizationId, fd)
          if (res.ok) setOk(true)
          else setError(res.error)
        })
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 24,
        maxWidth: 720,
      }}
    >
      <Field error={Boolean(error)}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <FieldInput
          id="name"
          name="name"
          type="text"
          defaultValue={initialName}
          required
          minLength={2}
          maxLength={80}
        />
        <FieldHint>What members see.</FieldHint>
      </Field>
      <Field error={Boolean(error)}>
        <FieldLabel htmlFor="slug">Slug</FieldLabel>
        <FieldInput
          id="slug"
          name="slug"
          type="text"
          defaultValue={initialSlug}
          required
          pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
        />
        {error ? (
          <FieldHint role="alert">{error}</FieldHint>
        ) : ok ? (
          <FieldHint>Saved.</FieldHint>
        ) : (
          <FieldHint>Lowercase / digits / hyphens.</FieldHint>
        )}
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Button type="submit" variant="solid" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        setOk(false)
        const form = e.currentTarget
        const fd = new FormData(form)
        startTransition(async () => {
          const res = await inviteMemberAction(organizationId, fd)
          if (res.ok) {
            setOk(true)
            form.reset()
          } else {
            setError(res.error)
          }
        })
      }}
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <Field error={Boolean(error)} style={{ minWidth: 280 }}>
        <FieldLabel htmlFor="invite-email">Email</FieldLabel>
        <FieldInput
          id="invite-email"
          name="email"
          type="email"
          placeholder="them@—"
          required
        />
        {error ? (
          <FieldHint role="alert">{error}</FieldHint>
        ) : ok ? (
          <FieldHint>Invitation sent.</FieldHint>
        ) : (
          <FieldHint>Email of the person to invite.</FieldHint>
        )}
      </Field>
      <Field style={{ minWidth: 180 }}>
        <FieldLabel htmlFor="invite-role">Role</FieldLabel>
        <FieldInput
          id="invite-role"
          name="role"
          type="text"
          defaultValue="member"
          list="org-role-suggestions"
          required
        />
        <datalist id="org-role-suggestions">
          <option value="member" />
          <option value="admin" />
          <option value="owner" />
        </datalist>
        <FieldHint>member · admin · owner</FieldHint>
      </Field>
      <Button type="submit" variant="solid" arrow disabled={pending}>
        {pending ? 'Sending…' : 'Send invite'}
      </Button>
    </form>
  )
}

export function RemoveMemberButton({
  organizationId,
  memberIdOrEmail,
}: {
  organizationId: string
  memberIdOrEmail: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Kick</Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Remove member">
        <DialogHeader>
          <DialogTitle>Remove {memberIdOrEmail}?</DialogTitle>
          <DialogDescription>
            They lose access to this organization. The user account itself
            remains.
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
                const res = await removeMemberAction(
                  organizationId,
                  memberIdOrEmail,
                )
                if (!res.ok) setError(res.error)
              })
            }}
          >
            {pending ? 'Removing…' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CancelInvitationButton({
  organizationId,
  invitationId,
}: {
  organizationId: string
  invitationId: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      {error ? (
        <span
          role="alert"
          style={{
            color: 'var(--cinnabar)',
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            fontSize: 13,
          }}
        >
          {error}
        </span>
      ) : null}
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const res = await cancelInvitationAction(
              organizationId,
              invitationId,
            )
            if (!res.ok) setError(res.error)
          })
        }}
      >
        {pending ? 'Cancelling…' : 'Cancel'}
      </Button>
    </span>
  )
}

export function DeleteOrganizationDialog({
  organizationId,
  name,
}: {
  organizationId: string
  name: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Delete</Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Delete organization">
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            The organization, its memberships, and all pending invitations
            are removed. Sessions pointing at this org are detached. This
            cannot be undone.
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
                const res = await deleteOrganizationAction(organizationId)
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
