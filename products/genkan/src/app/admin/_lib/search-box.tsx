'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FieldInput } from '@iedora/design-system'
import { useState, useTransition } from 'react'

/**
 * Single-input search box. Submitting (Enter) pushes `?q=...` onto the
 * current URL — server components downstream read it. Empty clears it.
 *
 * Deliberately not debounced — admin tables are small and a keystroke-per-
 * request would thrash the server.
 */
export function SearchBox({ placeholder = 'Search' }: { placeholder?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')
  const [pending, startTransition] = useTransition()

  function commit(next: string) {
    const sp = new URLSearchParams(params.toString())
    if (next.trim()) sp.set('q', next.trim())
    else sp.delete('q')
    startTransition(() => {
      router.push(`?${sp.toString()}`, { scroll: false })
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        commit(value)
      }}
      style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 260 }}
    >
      <FieldInput
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={pending}
        style={{ width: '100%' }}
      />
    </form>
  )
}
