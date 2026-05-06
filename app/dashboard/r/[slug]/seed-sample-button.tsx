'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { seedSampleMenu } from './actions'

export function SeedSampleButton({ slug }: { slug: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const res = await seedSampleMenu(slug)
      if ('ok' in res) {
        // Land directly inside the new menu so the user can see the preloaded
        // categories and items right away.
        router.push(`/dashboard/r/${slug}/m/${res.menuId}`)
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
      data-testid="seed-sample-menu"
    >
      {pending ? 'Seeding…' : 'Sample menu'}
    </Button>
  )
}
