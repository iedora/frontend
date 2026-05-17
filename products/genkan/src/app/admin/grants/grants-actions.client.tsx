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
} from '@iedora/design-system'
import { revokeGrantAction } from './actions'

export function RevokeGrantButton({ consentId }: { consentId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Revoke</Button>
      </DialogTrigger>
      <DialogContent eyebrow="/ Dialog · Revoke grant">
        <DialogHeader>
          <DialogTitle>Revoke this grant?</DialogTitle>
          <DialogDescription>
            Existing access and refresh tokens are deleted. The next time the
            user attempts to use this application, they’ll see the consent
            screen again.
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
                const res = await revokeGrantAction(consentId)
                if (!res.ok) setError(res.error)
              })
            }}
          >
            {pending ? 'Revoking…' : 'Revoke'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
