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
import {
  banAction,
  deleteUserAction,
  impersonateAction,
  revokeSessionAction,
  setRoleAction,
  unbanAction,
} from './actions'

/**
 * Top-right cluster on the user-detail page: impersonate · delete. The
 * delete sits behind a confirm Dialog with a destructive-action note.
 */
export function UserActions({
  userId,
  banned,
}: {
  userId: string
  banned: boolean
}) {
  return (
    <>
      <ImpersonateButton userId={userId} />
      <DeleteUserDialog userId={userId} banned={banned} />
    </>
  )
}

function ImpersonateButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="default"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await impersonateAction(userId)
        })
      }}
    >
      {pending ? 'Entering…' : 'Impersonate'}
    </Button>
  )
}

function DeleteUserDialog({
  userId,
  banned,
}: {
  userId: string
  banned: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Delete</Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Confirm delete">
        <DialogHeader>
          <DialogTitle>Delete this user?</DialogTitle>
          <DialogDescription>
            This removes the account and cascades through sessions, accounts,
            invitations, and OAuth grants. {banned ? 'The user is already banned.' : ''}{' '}
            This cannot be undone.
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
                const res = await deleteUserAction(userId)
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

/** Tiny form: pick a role + save. */
export function RoleForm({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: string
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
          const res = await setRoleAction(userId, fd)
          if (res.ok) setOk(true)
          else setError(res.error)
        })
      }}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <Field error={Boolean(error)} style={{ minWidth: 240 }}>
        <FieldLabel htmlFor="role">Role</FieldLabel>
        <FieldInput
          id="role"
          name="role"
          type="text"
          defaultValue={currentRole}
          list="role-suggestions"
          required
        />
        <datalist id="role-suggestions">
          <option value="user" />
          <option value="admin" />
        </datalist>
        {error ? (
          <FieldHint role="alert">{error}</FieldHint>
        ) : ok ? (
          <FieldHint>Saved.</FieldHint>
        ) : (
          <FieldHint>
            <code>user</code> or <code>admin</code>.
          </FieldHint>
        )}
      </Field>
      <Button type="submit" variant="solid" disabled={pending}>
        {pending ? 'Saving…' : 'Save role'}
      </Button>
    </form>
  )
}

/** Compound: ban form + unban toggle. */
export function BanForm({
  userId,
  banned,
  banReason,
}: {
  userId: string
  banned: boolean
  banReason: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (banned) {
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            color: 'var(--ink-70)',
          }}
        >
          Reason: {banReason ?? '—'}
        </span>
        <Button
          variant="default"
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const res = await unbanAction(userId)
              if (!res.ok) setError(res.error)
            })
          }}
        >
          {pending ? 'Unbanning…' : 'Unban'}
        </Button>
        {error ? (
          <span
            role="alert"
            style={{
              color: 'var(--cinnabar)',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
            }}
          >
            {error}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="accent">Ban user</Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Ban">
        <DialogHeader>
          <DialogTitle>Ban this account?</DialogTitle>
          <DialogDescription>
            The user is signed out everywhere and can’t sign in again until
            unbanned. Leave the expiry empty for an indefinite ban.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const res = await banAction(userId, fd)
              if (!res.ok) setError(res.error)
            })
          }}
        >
          <div style={{ display: 'grid', gap: 20 }}>
            <Field error={Boolean(error)}>
              <FieldLabel htmlFor="banReason">Reason</FieldLabel>
              <FieldTextarea
                id="banReason"
                name="banReason"
                rows={3}
                placeholder="Recorded against the account."
                required
              />
              <FieldHint>
                Visible to other admins through the audit feed.
              </FieldHint>
            </Field>
            <Field error={Boolean(error)}>
              <FieldLabel htmlFor="banExpiresInDays">
                Expires in (days)
              </FieldLabel>
              <FieldInput
                id="banExpiresInDays"
                name="banExpiresInDays"
                type="number"
                min={1}
                step={1}
                placeholder="Leave empty for indefinite"
              />
              {error ? (
                <FieldHint role="alert">{error}</FieldHint>
              ) : (
                <FieldHint>Empty = no expiry.</FieldHint>
              )}
            </Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Banning…' : 'Confirm ban'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RevokeSessionButton({
  userId,
  sessionToken,
}: {
  userId: string
  sessionToken: string
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
            const res = await revokeSessionAction(userId, sessionToken)
            if (!res.ok) setError(res.error)
          })
        }}
      >
        {pending ? 'Revoking…' : 'Revoke'}
      </Button>
    </span>
  )
}
