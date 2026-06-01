import { Fragment, type ReactNode } from 'react'

/**
 * Tokenizer + renderer for TOON syntax. Pure function — given a raw
 * TOON string, returns an array of <div> nodes (one per source line)
 * with per-token <span> wrappers carrying colour classes.
 *
 * Designed to sit BEHIND a transparent `<textarea>` in the overlay
 * pattern: pre's text occupies the exact same character grid as the
 * textarea's, so caret + selection stay aligned with the colours.
 *
 * Tokens:
 *   • indent      — leading whitespace (preserved as-is)
 *   • dash        — `- ` array-item marker
 *   • key         — `name`, `categories`, etc. before `:`
 *   • bracket     — `[3]` size annotation
 *   • brace       — `{name,priceCents}` column declaration
 *   • colon       — `:` separator
 *   • comma       — CSV cell separator
 *   • hex         — `#8b4513` rendered in the actual colour
 *   • number      — `1450`, `0.5`
 *   • string      — anything else after `:` or in a CSV cell
 *
 * Trailing newline preserved as an empty `<div>` so the overlay's
 * line count matches the textarea's.
 */

const KEY_RE = /^([a-zA-Z_][\w-]*)/
const BRACKETS_RE = /^\[\d+\]/
const BRACES_RE = /^\{[^}]*\}/
const HEX_RE = /^#[0-9a-fA-F]{3,8}\b/
const NUM_RE = /^-?\d+(?:\.\d+)?\b/

type Tok = { kind: string; text: string; style?: React.CSSProperties }

function tokenizeValue(text: string): Tok[] {
  // CSV-style value (data row under a `{cols}` table) → split on commas
  // and tokenize each cell. Pure punctuation `,` keeps the same class
  // as the rest so eyes don't jump.
  if (text.includes(',') && !/^"/.test(text)) {
    const out: Tok[] = []
    const cells = text.split(',')
    cells.forEach((cell, i) => {
      out.push(...tokenizeAtom(cell))
      if (i < cells.length - 1) out.push({ kind: 'comma', text: ',' })
    })
    return out
  }
  return tokenizeAtom(text)
}

function tokenizeAtom(text: string): Tok[] {
  const stripped = text.trim()
  if (stripped.length === 0) {
    return text.length > 0 ? [{ kind: 'ws', text }] : []
  }
  // Preserve leading + trailing whitespace around the atom so the
  // overlay column stays aligned with the textarea's.
  const lead = text.match(/^\s*/)?.[0] ?? ''
  const trail = text.match(/\s*$/)?.[0] ?? ''
  const body = text.slice(lead.length, text.length - trail.length)
  const out: Tok[] = []
  if (lead) out.push({ kind: 'ws', text: lead })
  if (HEX_RE.test(body)) {
    out.push({ kind: 'hex', text: body, style: { color: body } })
  } else if (NUM_RE.test(body) && NUM_RE.exec(body)?.[0] === body) {
    out.push({ kind: 'num', text: body })
  } else {
    out.push({ kind: 'str', text: body })
  }
  if (trail) out.push({ kind: 'ws', text: trail })
  return out
}

function tokenizeLine(line: string): Tok[] {
  const out: Tok[] = []
  // Indentation.
  const indentMatch = line.match(/^\s*/)
  const indent = indentMatch ? indentMatch[0] : ''
  if (indent) out.push({ kind: 'ws', text: indent })
  let rest = line.slice(indent.length)

  // Array-item dash `- ` (only at the start of the content area).
  if (rest.startsWith('- ')) {
    out.push({ kind: 'dash', text: '- ' })
    rest = rest.slice(2)
  }

  // Key (followed optionally by `[N]`, `{cols}`, then `:` and the rest).
  const keyMatch = rest.match(KEY_RE)
  if (keyMatch) {
    out.push({ kind: 'key', text: keyMatch[0] })
    rest = rest.slice(keyMatch[0].length)
    const brackets = rest.match(BRACKETS_RE)
    if (brackets) {
      out.push({ kind: 'bracket', text: brackets[0] })
      rest = rest.slice(brackets[0].length)
    }
    const braces = rest.match(BRACES_RE)
    if (braces) {
      out.push({ kind: 'brace', text: braces[0] })
      rest = rest.slice(braces[0].length)
    }
    if (rest.startsWith(':')) {
      out.push({ kind: 'colon', text: ':' })
      rest = rest.slice(1)
    }
    if (rest.length > 0) out.push(...tokenizeValue(rest))
    return out
  }

  // No leading key — entire content is a value (CSV row under a
  // `{cols}` header, or a continued value).
  if (rest.length > 0) out.push(...tokenizeValue(rest))
  return out
}

const CLS: Record<string, string> = {
  ws: '',
  dash: 'text-[var(--ink-40)]',
  key: 'text-[var(--ink)] font-medium',
  bracket: 'text-[var(--ink-40)]',
  brace: 'text-[var(--ink-40)]',
  colon: 'text-[var(--ink-40)]',
  comma: 'text-[var(--ink-40)]',
  num: 'text-[var(--cinnabar)]',
  str: 'text-[var(--ink-85,var(--ink))]',
  hex: 'font-medium', // colour injected via inline style
}

export function highlightToon(raw: string): ReactNode {
  // `split('\n')` preserves the empty trailing line if the input ends
  // with a newline, which keeps the overlay aligned with the textarea
  // (textarea always renders that trailing empty line too).
  const lines = raw.split('\n')
  return lines.map((line, li) => {
    const toks = tokenizeLine(line)
    return (
      <div key={li}>
        {toks.length === 0 ? (
          // Empty lines need a literal space to claim a row of height
          // in the overlay; matches the textarea's empty-line height.
          ' '
        ) : (
          toks.map((t, ti) => (
            <Fragment key={ti}>
              {t.kind === 'ws' ? (
                t.text
              ) : (
                <span className={CLS[t.kind] ?? ''} style={t.style}>
                  {t.text}
                </span>
              )}
            </Fragment>
          ))
        )}
      </div>
    )
  })
}
