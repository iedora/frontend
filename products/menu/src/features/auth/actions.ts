'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  REFRESH_COOKIE,
  authCookies,
  clearedAuthCookies,
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
  type AuthResult,
} from '@iedora/api-client'
import { brandUrl, isSameIedoraOrigin } from '@iedora/brand'

/**
 * Auth server actions — the only code that exchanges credentials with
 * the auth service and writes the auth cookies. Forms submit here
 * via useActionState; on success the action redirects to the validated
 * `next` target, on failure it returns a state the form translates.
 */

export type AuthFormState = {
  error: 'invalid' | 'generic' | null
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  let result: AuthResult
  try {
    result = await login(email, password)
  } catch {
    return { error: 'invalid' }
  }
  await persistAuth(result)
  redirect(safeNext(formData))
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  let result: AuthResult
  try {
    result = await register(email, password, name)
  } catch {
    return { error: 'generic' }
  }
  await persistAuth(result)
  redirect(safeNext(formData))
}

export type ForgotFormState = { sent: boolean }
export type ResetFormState = { error: 'mismatch' | 'invalid' | null; done: boolean }

/**
 * Forgot-password: kicks off a reset email. The auth service never
 * reveals whether the address exists, so this ALWAYS reports "sent" and
 * swallows errors — the form shows a neutral "check your inbox".
 */
export async function forgotPasswordAction(
  _prev: ForgotFormState,
  formData: FormData,
): Promise<ForgotFormState> {
  const email = String(formData.get('email') ?? '')
  try {
    await forgotPassword(email)
  } catch {
    // no enumeration, no error surface — still report success
  }
  return { sent: true }
}

/**
 * Reset-password: sets a new password from the emailed token. Validates
 * the confirmation match locally, then calls the auth service (which
 * rejects a bad / expired token). No auto-login — the form sends the
 * user to sign in afterwards.
 */
export async function resetPasswordAction(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password !== confirm) return { error: 'mismatch', done: false }
  try {
    await resetPassword(token, password)
  } catch {
    return { error: 'invalid', done: false }
  }
  return { error: null, done: true }
}

/** Revokes the session on the Go side and clears both auth cookies. */
export async function signOutAction(next?: string): Promise<void> {
  const store = await cookies()
  const refreshToken = store.get(REFRESH_COOKIE)?.value
  if (refreshToken) {
    await logout(refreshToken)
  }
  for (const c of clearedAuthCookies()) {
    store.set(c.name, c.value, c.options)
  }
  redirect(isSameIedoraOrigin(next) ? next! : brandUrl())
}

async function persistAuth(result: AuthResult): Promise<void> {
  const store = await cookies()
  for (const c of authCookies(result.tokens, result.setCookies)) {
    store.set(c.name, c.value, c.options)
  }
}

function safeNext(formData: FormData): string {
  const next = formData.get('next')
  return typeof next === 'string' && isSameIedoraOrigin(next) ? next : brandUrl()
}
