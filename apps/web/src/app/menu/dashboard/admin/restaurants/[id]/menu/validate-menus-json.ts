import { staffReplaceMenus } from '@iedora/contracts'
import { friendlyZodMessage } from '../../../../../_components/zod-message'
import type { JsonValidation } from '../../new/validate-menu-json'

// Client-side validation for the admin "Edit menu as JSON" editor. The document
// is the menu tree only ({ "menus": [...] }) — identity/languages aren't touched
// here. Runs the SAME `staffReplaceMenus` schema the service validates against,
// so green here is what the server accepts (it still owns the language + budget
// checks against the restaurant).
export function validateMenusJson(text: string): JsonValidation {
  if (!text.trim()) return { state: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { state: 'syntax', problems: [{ path: '', message: (err as Error).message }] }
  }

  const result = staffReplaceMenus.safeParse(parsed)
  if (result.success) return { state: 'valid' }

  return {
    state: 'invalid',
    problems: result.error.issues.map((issue) => ({
      path: issue.path.length ? issue.path.join('.') : '(root)',
      message: friendlyZodMessage(issue),
    })),
  }
}

export const isReplaceable = (v: JsonValidation): boolean => v.state === 'valid'
