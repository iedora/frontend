'use client'

import { useState, useTransition } from 'react'
import { Button } from '@iedora/design-system'
import { revokeAnySessionAction } from './actions'

export function RevokeAnySessionButton({
  sessionToken,
}: {
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
            const res = await revokeAnySessionAction(sessionToken)
            if (!res.ok) setError(res.error)
          })
        }}
      >
        {pending ? 'Revoking…' : 'Revoke'}
      </Button>
    </span>
  )
}
