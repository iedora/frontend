'use server'

import { revalidatePath } from 'next/cache'
import {
  createTenant,
  deleteTenant,
  getAuth,
  TENANT_ROLE_PRESETS,
} from '@iedora/auth'
import {
  actorFromSession,
  getSession,
  requireScope,
} from '@iedora/auth/server'
import { SCOPES } from '@iedora/auth/scopes'
import { cancelSubscription, createSubscription } from '@iedora/billing'
import { PRODUCTS } from '@iedora/brand'
import { decode as toonDecode } from '@toon-format/toon'
import {
  createRestaurantFromJson,
  drizzleRestaurantImport,
  restaurantImportSchema,
} from '@iedora/product-menu/features/restaurant-import-json'
import {
  nextAvailableSlug,
  slugify,
} from '@iedora/product-menu/features/restaurant-slug'

/**
 * Staff-only end-to-end provisioning. From a single JSON payload:
 *   1. Create the founder user (better-auth signUpEmail)
 *   2. Create the tenant + founder membership
 *   3. Enrol the tenant in the menu product on the chosen plan
 *   4. Insert the restaurant + menu + categories + items + variants
 *      (single transaction)
 *
 * Each step that succeeds is tracked so a downstream failure can
 * best-effort rollback (cancel subscription → delete tenant). The user
 * row is intentionally NOT rolled back: better-auth account deletion
 * is not exposed and an orphaned user can just sign in to a future
 * tenant. Slug allocation is collision-safe so retries are idempotent.
 *
 * Gate: `staff:menu:restaurants:transfer` — same scope as the manual
 * create + transfer flows. Admin operates from their own session; the
 * new founder user does NOT supplant the admin's active tenant.
 */

const SCOPE = SCOPES.menu.staff.restaurants.transfer

type Issue = { path: string; message: string }

export type ImportFromJsonResult =
  | { ok: true; slug: string; tenantId: string; userId: string }
  | { ok: false; error: string; issues?: Issue[] }

type ValidatePreview = {
  restaurantName: string
  categories: number
  items: number
  userEmail: string
  tenantPlan: string
}

export type ValidateResult =
  | { ok: true; preview: ValidatePreview }
  | { ok: false; error: string; issues?: Issue[] }

function parseAndValidate(raw: string):
  | { ok: true; data: ReturnType<typeof restaurantImportSchema.parse> }
  | { ok: false; error: string; issues?: Issue[] } {
  let parsed: unknown
  try {
    parsed = toonDecode(raw)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'TOON inválido',
    }
  }
  const result = restaurantImportSchema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      error: 'Schema inválido',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      })),
    }
  }
  return { ok: true, data: result.data }
}

export async function validateRestaurantJsonAction(
  raw: string,
): Promise<ValidateResult> {
  await requireScope(SCOPE)
  const r = parseAndValidate(raw)
  if (!r.ok) return r
  const items = r.data.menu.categories.reduce(
    (acc, c) => acc + c.items.length,
    0,
  )
  return {
    ok: true,
    preview: {
      restaurantName: r.data.restaurant.name,
      categories: r.data.menu.categories.length,
      items,
      userEmail: r.data.user.email,
      tenantPlan: r.data.tenant.plan,
    },
  }
}

export async function importRestaurantFromJsonAction(
  raw: string,
): Promise<ImportFromJsonResult> {
  await requireScope(SCOPE)
  const session = await getSession()
  if (!session?.user) return { ok: false, error: 'no session' }

  const parsed = parseAndValidate(raw)
  if (!parsed.ok) return parsed
  const data = parsed.data
  const adminActor = actorFromSession(session)

  // ── Step 1: founder user ───────────────────────────────────────────
  let userId: string
  try {
    const auth = getAuth()
    const created = await auth.api.signUpEmail({
      body: {
        email: data.user.email,
        password: data.user.password,
        name: data.user.name ?? data.user.email.split('@')[0] ?? data.user.email,
      },
    })
    if (!created?.user?.id) {
      return { ok: false, error: 'sign-up returned no user' }
    }
    userId = created.user.id
  } catch (err) {
    console.error('[admin/restaurants/import] signUpEmail failed', err)
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error: /exist|already/i.test(msg)
        ? `Já existe um utilizador com o email ${data.user.email}.`
        : `Não foi possível criar o utilizador: ${msg}`,
    }
  }

  // Founder owns the tenant. The audit actor stays the admin (who
  // triggered the import); the founder is the target/grantee.
  const founderActor = {
    userId,
    email: data.user.email,
    role: null,
  }

  // ── Step 2: tenant + founder membership (atomic) ───────────────────
  // Parallel with slug allocation — both round-trip DBs and are independent.
  let tenantId: string
  let slug: string
  try {
    const [tenant, allocatedSlug] = await Promise.all([
      createTenant({
        name: data.tenant.name?.trim() || data.restaurant.name,
        founder: { userId, scopes: TENANT_ROLE_PRESETS.owner },
        actor: adminActor,
      }),
      nextAvailableSlug(slugify(data.restaurant.name)),
    ])
    tenantId = tenant.id
    slug = allocatedSlug
  } catch (err) {
    console.error('[admin/restaurants/import] tenant/slug failed', err)
    return {
      ok: false,
      error: `Falha a criar tenant: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // ── Step 3: billing subscription ───────────────────────────────────
  let subscriptionId: string | null = null
  try {
    const sub = await createSubscription({
      tenantId,
      product: PRODUCTS.menu,
      plan: data.tenant.plan,
      status: 'active',
      actor: founderActor,
    })
    subscriptionId = sub.id
  } catch (err) {
    console.error('[admin/restaurants/import] createSubscription failed', err)
    // Rollback: orphaned tenant is worse than no tenant — clean it up.
    await deleteTenant({
      tenantId,
      actor: adminActor,
      reason: 'rollback: createSubscription failed during JSON import',
    }).catch((cleanupErr) =>
      console.error('[admin/restaurants/import] rollback deleteTenant failed', cleanupErr),
    )
    return {
      ok: false,
      error: `Falha a criar subscrição: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // ── Step 4: restaurant tree (single transaction) ───────────────────
  const res = await createRestaurantFromJson(drizzleRestaurantImport, {
    tenantId,
    slug,
    data,
  })
  if (!res.ok) {
    console.error('[admin/restaurants/import] restaurant import failed', res.error)
    // Rollback billing then tenant (order matters: subscription FK → tenant).
    if (subscriptionId) {
      await cancelSubscription({
        subscriptionId,
        immediate: true,
        actor: adminActor,
      }).catch((err) =>
        console.error('[admin/restaurants/import] rollback cancelSubscription failed', err),
      )
    }
    await deleteTenant({
      tenantId,
      actor: adminActor,
      reason: 'rollback: restaurant import failed',
    }).catch((err) =>
      console.error('[admin/restaurants/import] rollback deleteTenant failed', err),
    )
    return { ok: false, error: `Falha a importar restaurante: ${res.error}` }
  }

  revalidatePath('/menu/dashboard/admin/restaurants')
  revalidatePath('/menu/dashboard')
  return { ok: true, slug: res.slug, tenantId, userId }
}
