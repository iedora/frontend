import { describe, expect, it, vi } from 'vitest'
import { restaurantImportSchema, type RestaurantImport } from '../schema'
import type { RestaurantImportPort } from '../ports'
import { createRestaurantFromJson } from './create-restaurant-from-json'

vi.mock('server-only', () => ({}))

function fakeData(): RestaurantImport {
  return restaurantImportSchema.parse({
    user: { email: 'a@b.com', password: 'longenough' },
    tenant: { plan: 'free' },
    restaurant: {
      name: 'Casa Pão',
      defaultLanguage: 'pt',
      supportedLanguages: ['pt'],
    },
    menu: {
      name: 'Menu',
      categories: [{ name: 'C', items: [{ name: 'Item', priceCents: 100 }] }],
    },
  })
}

describe('createRestaurantFromJson', () => {
  it('returns ok + the slug/ids handed in by the port', async () => {
    const port: RestaurantImportPort = {
      async importRestaurant(_input) {
        return { restaurantId: 'r-123', menuId: 'm-456' }
      },
    }
    const res = await createRestaurantFromJson(port, {
      tenantId: 't-1',
      slug: 'casa-pao',
      data: fakeData(),
    })
    expect(res).toEqual({
      ok: true,
      slug: 'casa-pao',
      restaurantId: 'r-123',
      menuId: 'm-456',
    })
  })

  it('passes the full payload through to the port unchanged', async () => {
    const captured: Array<Parameters<RestaurantImportPort['importRestaurant']>[0]> = []
    const port: RestaurantImportPort = {
      async importRestaurant(input) {
        captured.push(input)
        return { restaurantId: 'r', menuId: 'm' }
      },
    }
    const data = fakeData()
    await createRestaurantFromJson(port, {
      tenantId: 't-1',
      slug: 'casa-pao',
      data,
    })
    expect(captured).toHaveLength(1)
    expect(captured[0]).toEqual({
      tenantId: 't-1',
      slug: 'casa-pao',
      data,
    })
  })

  it('never throws — port errors come back as { ok:false, error }', async () => {
    const port: RestaurantImportPort = {
      async importRestaurant() {
        throw new Error('db connection refused')
      },
    }
    const res = await createRestaurantFromJson(port, {
      tenantId: 't-1',
      slug: 'casa-pao',
      data: fakeData(),
    })
    expect(res).toEqual({ ok: false, error: 'db connection refused' })
  })

  it('stringifies non-Error throws', async () => {
    const port: RestaurantImportPort = {
      async importRestaurant() {
        throw 'string thrown'
      },
    }
    const res = await createRestaurantFromJson(port, {
      tenantId: 't-1',
      slug: 'casa-pao',
      data: fakeData(),
    })
    expect(res).toEqual({ ok: false, error: 'string thrown' })
  })
})
