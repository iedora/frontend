'use client'

import { useRouter } from 'next/navigation'
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import {
  restaurantImportSchema,
  type RestaurantImport,
} from '@iedora/product-menu/features/restaurant-import-json/schema'
import { decode as toonDecode, encode as toonEncode } from '@toon-format/toon'
import {
  EXAMPLES,
  exampleAsText,
  LLM_PROMPT,
} from '@iedora/product-menu/features/restaurant-import-json/examples'
import { highlightToon } from './toon-highlight'
import { importToPublicMenuLoaded } from '@iedora/product-menu/features/restaurant-import-json/to-public'
import { PublicMenuView } from '@iedora/product-menu/features/menu-publishing/rsc/public-menu-view-ui'
import {
  FONTS,
  LAYOUTS,
} from '@iedora/product-menu/features/menu-publishing/rsc/theme'
import type { LanguageCode } from '@iedora/product-menu/features/i18n'
import { importRestaurantFromJsonAction } from '../import-actions'

type Issue = { path: string; message: string }

type ValidState =
  | { kind: 'empty' }
  | { kind: 'invalid'; error: string; issues: Issue[]; errorLine?: number }
  | { kind: 'valid'; data: RestaurantImport }

const INDENT = '  ' // 2 spaces
const INDENT_LEN = INDENT.length

/**
 * Extract 1-based line number from a JSON.parse SyntaxError. Modern V8
 * embeds `(line N column C)`; older / non-V8 give `position N`, from which
 * the line is `(text.slice(0,N).match(/\n/g)?.length ?? 0) + 1`.
 */
function errorLineFromParseError(err: unknown, text: string): number | undefined {
  if (!(err instanceof Error)) return undefined
  const lineMatch = err.message.match(/line (\d+)/i)
  if (lineMatch?.[1]) return parseInt(lineMatch[1], 10)
  const posMatch = err.message.match(/position (\d+)/i)
  if (posMatch?.[1]) {
    const pos = Math.min(parseInt(posMatch[1], 10), text.length)
    return (text.slice(0, pos).match(/\n/g)?.length ?? 0) + 1
  }
  return undefined
}

function validate(raw: string): ValidState {
  if (raw.trim().length === 0) return { kind: 'empty' }
  let parsed: unknown
  try {
    parsed = toonDecode(raw)
  } catch (err) {
    return {
      kind: 'invalid',
      error: err instanceof Error ? err.message : 'TOON inválido',
      issues: [],
      errorLine: errorLineFromParseError(err, raw),
    }
  }
  const result = restaurantImportSchema.safeParse(parsed)
  if (!result.success) {
    return {
      kind: 'invalid',
      error: 'Schema inválido',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      })),
    }
  }
  return { kind: 'valid', data: result.data }
}

/**
 * Compute the [startLineStart, endLineEnd] character range that spans every
 * line touched by `[selStart, selEnd]`. Used by Tab / Shift+Tab / cut-line
 * so a multi-line edit doesn't half-mutate the first / last selected line.
 */
function lineRangeForSelection(
  raw: string,
  selStart: number,
  selEnd: number,
): { startLine: number; endLine: number; lineStartChar: number; lineEndChar: number } {
  const startLineChar = raw.lastIndexOf('\n', selStart - 1) + 1
  const endOfSelLine = raw.indexOf('\n', selEnd)
  const endLineChar = endOfSelLine === -1 ? raw.length : endOfSelLine
  const startLine =
    (raw.slice(0, startLineChar).match(/\n/g)?.length ?? 0)
  const endLine =
    (raw.slice(0, endLineChar).match(/\n/g)?.length ?? 0)
  return {
    startLine,
    endLine,
    lineStartChar: startLineChar,
    lineEndChar: endLineChar,
  }
}

/**
 * Indent every line in the selection (VS Code Tab behaviour for multi-line
 * selections). Single-line cursor case is handled separately to insert at
 * the caret rather than at line start.
 */
function indentLines(
  raw: string,
  selStart: number,
  selEnd: number,
): { next: string; nextStart: number; nextEnd: number } {
  const { lineStartChar, lineEndChar } = lineRangeForSelection(raw, selStart, selEnd)
  const block = raw.slice(lineStartChar, lineEndChar)
  const lines = block.split('\n')
  const indented = lines.map((l) => INDENT + l).join('\n')
  const delta = INDENT_LEN * lines.length
  const next = raw.slice(0, lineStartChar) + indented + raw.slice(lineEndChar)
  return {
    next,
    nextStart: selStart + INDENT_LEN,
    nextEnd: selEnd + delta,
  }
}

/**
 * Remove up to `INDENT_LEN` leading spaces from every line in the selection.
 * Cursor shifts left by however many spaces were actually removed on the
 * first / last lines.
 */
function unindentLines(
  raw: string,
  selStart: number,
  selEnd: number,
): { next: string; nextStart: number; nextEnd: number } {
  const { lineStartChar, lineEndChar } = lineRangeForSelection(raw, selStart, selEnd)
  const block = raw.slice(lineStartChar, lineEndChar)
  const lines = block.split('\n')
  let firstRemoved = 0
  let totalRemoved = 0
  const trimmed = lines.map((l, i) => {
    let removed = 0
    while (removed < INDENT_LEN && l[removed] === ' ') removed++
    if (i === 0) firstRemoved = removed
    totalRemoved += removed
    return l.slice(removed)
  })
  const next =
    raw.slice(0, lineStartChar) + trimmed.join('\n') + raw.slice(lineEndChar)
  return {
    next,
    nextStart: Math.max(lineStartChar, selStart - firstRemoved),
    nextEnd: Math.max(selStart - firstRemoved, selEnd - totalRemoved),
  }
}

/**
 * Cut the line under the cursor when there is no selection (VS Code's
 * Cmd+X behaviour). Returns the new text + cursor at the start of the
 * next line (or end of file) + the text to copy (with trailing newline).
 */
function cutCurrentLine(
  raw: string,
  selStart: number,
): { next: string; nextStart: number; copied: string } {
  const lineStart = raw.lastIndexOf('\n', selStart - 1) + 1
  const lineEndExclusive = raw.indexOf('\n', selStart)
  const cutEnd = lineEndExclusive === -1 ? raw.length : lineEndExclusive + 1
  const copied = raw.slice(lineStart, cutEnd)
  const next = raw.slice(0, lineStart) + raw.slice(cutEnd)
  return { next, nextStart: lineStart, copied }
}

/**
 * Re-encode the editor content through the canonical TOON encoder.
 * Cheap normalisation step bound to Cmd/Ctrl+Shift+F and the Format
 * button. Returns null on parse failure (caller no-ops).
 */
function formatToon(raw: string): string | null {
  try {
    return toonEncode(toonDecode(raw))
  } catch {
    return null
  }
}

/**
 * Set `restaurant.theme[key] = value` on the parsed payload, creating the
 * theme object lazily. Returns the re-encoded TOON or null when the input
 * wasn't decodable (UI gates the controls on `state.kind === 'valid'` so
 * this is the rare-error path).
 */
function setThemeField(
  raw: string,
  key: 'layout' | 'font' | 'primaryColor' | 'secondaryColor',
  value: string,
): string | null {
  try {
    const parsed = toonDecode(raw) as Record<string, unknown>
    const restaurant = (parsed.restaurant ?? {}) as Record<string, unknown>
    const theme = (restaurant.theme ?? {}) as Record<string, unknown>
    theme[key] = value
    restaurant.theme = theme
    parsed.restaurant = restaurant
    return toonEncode(parsed)
  } catch {
    return null
  }
}

type Viewport = 'mobile' | 'tablet' | 'desktop'
const VIEWPORT_WIDTH: Record<Viewport, number | null> = {
  mobile: 390,   // iPhone 14
  tablet: 768,   // iPad portrait
  desktop: null, // pane width
}

type Warning = {
  level: 'error' | 'warn' | 'info'
  message: string
}

/**
 * Surface anything the operator should notice before clicking "Criar":
 * placeholder credentials, missing translations, empty categories,
 * extreme prices, etc. Cheap to derive on every render — no memo needed.
 */
function collectWarnings(state: ValidState): Warning[] {
  const w: Warning[] = []
  if (state.kind === 'invalid') {
    w.push({
      level: 'error',
      message:
        state.issues.length > 0
          ? `Schema com ${state.issues.length} erro${state.issues.length === 1 ? '' : 's'} — edição visual e submit desativados.`
          : state.errorLine
            ? `Sintaxe inválida na linha ${state.errorLine} — edição visual e submit desativados.`
            : 'TOON inválido — edição visual e submit desativados.',
    })
    return w
  }
  if (state.kind !== 'valid') return w

  const { data } = state
  if (/\.example\.(com|org|net)$/i.test(data.user.email)) {
    w.push({
      level: 'warn',
      message: `O email do owner (${data.user.email}) é um placeholder. Substitui pelo email real antes de criar.`,
    })
  }
  if (/^change-me/i.test(data.user.password)) {
    w.push({
      level: 'warn',
      message: 'Password do owner é um placeholder. Substitui antes de criar.',
    })
  }
  const totalItems = data.menu.categories.reduce(
    (a, c) => a + c.items.length,
    0,
  )
  if (totalItems === 0) {
    w.push({ level: 'warn', message: 'Menu sem items.' })
  }
  const emptyCats = data.menu.categories.filter((c) => c.items.length === 0)
  if (emptyCats.length > 0) {
    w.push({
      level: 'info',
      message: `${emptyCats.length} categoria${emptyCats.length === 1 ? '' : 's'} sem items: ${emptyCats.map((c) => c.name).join(', ')}.`,
    })
  }
  const nonDefaultLangs = data.restaurant.supportedLanguages.filter(
    (l) => l !== data.restaurant.defaultLanguage,
  )
  if (nonDefaultLangs.length > 0) {
    // Quick heuristic: at least one item missing every translation.
    const missing = data.menu.categories.flatMap((c) =>
      c.items.filter((it) =>
        nonDefaultLangs.some((l) => !it.nameI18n?.[l]),
      ),
    )
    if (missing.length > 0) {
      w.push({
        level: 'info',
        message: `${missing.length} item${missing.length === 1 ? '' : 's'} sem tradução completa para ${nonDefaultLangs.join(', ')}.`,
      })
    }
  }
  const freePrices = data.menu.categories.flatMap((c) =>
    c.items.filter((it) => it.priceCents === 0),
  )
  if (freePrices.length > 0) {
    w.push({
      level: 'info',
      message: `${freePrices.length} item${freePrices.length === 1 ? '' : 's'} com preço 0 — confirma se é intencional.`,
    })
  }
  return w
}

export function ImportIde() {
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLPreElement>(null)
  const overlayRef = useRef<HTMLPreElement>(null)

  // Auto-focus the editor on desktop only — mobile would pop the keyboard
  // and shove the layout up. `(hover: hover) and (pointer: fine)` is the
  // standard "real" desktop detector (excludes tablets in touch mode).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (desktop.matches) editorRef.current?.focus()
  }, [])
  // Defer the heavy parse+render path so keystrokes stay responsive while
  // the preview catches up async.
  const deferredRaw = useDeferredValue(raw)
  const state = useMemo(() => validate(deferredRaw), [deferredRaw])
  const isStale = raw !== deferredRaw

  const [tab, setTab] = useState<'code' | 'preview'>('code')
  const [submitting, startSubmitting] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverIssues, setServerIssues] = useState<Issue[]>([])
  const [copied, setCopied] = useState(false)
  const [previewLang, setPreviewLang] = useState<LanguageCode | null>(null)
  const [viewport, setViewport] = useState<Viewport>('mobile')

  function onThemeChange(
    key: 'layout' | 'font' | 'primaryColor' | 'secondaryColor',
    value: string,
  ) {
    const next = setThemeField(raw, key, value)
    if (next) setRaw(next)
  }

  async function copyLlmPrompt() {
    try {
      await navigator.clipboard.writeText(LLM_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('[import-ide] clipboard write failed', err)
    }
  }

  function onSubmit() {
    if (state.kind !== 'valid') return
    setServerError(null)
    setServerIssues([])
    startSubmitting(async () => {
      const res = await importRestaurantFromJsonAction(raw)
      if (!res.ok) {
        setServerError(res.error)
        setServerIssues(res.issues ?? [])
        setTab('code')
        return
      }
      router.push(`/menu/dashboard/r/${res.slug}`)
      router.refresh()
    })
  }

  function applyEdit(
    next: string,
    selStart: number,
    selEnd: number = selStart,
  ) {
    setRaw(next)
    requestAnimationFrame(() => {
      const t = editorRef.current
      if (!t) return
      t.selectionStart = selStart
      t.selectionEnd = selEnd
    })
  }

  function onFormat() {
    const formatted = formatToon(raw)
    if (formatted === null || formatted === raw) return
    applyEdit(formatted, formatted.length)
  }

  function onEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const t = e.currentTarget
    const start = t.selectionStart
    const end = t.selectionEnd
    const hasSelection = start !== end
    const meta = e.metaKey || e.ctrlKey

    // Cmd/Ctrl+Shift+F → format JSON (VS Code default).
    if (meta && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      onFormat()
      return
    }

    // Cmd/Ctrl+S → submit when valid.
    if (meta && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      if (state.kind === 'valid' && !submitting) onSubmit()
      return
    }

    // Cmd/Ctrl+X with NO selection → cut the current line (VS Code).
    // With a selection the browser default does the right thing.
    if (meta && !e.shiftKey && (e.key === 'x' || e.key === 'X') && !hasSelection) {
      e.preventDefault()
      const { next, nextStart, copied } = cutCurrentLine(raw, start)
      navigator.clipboard.writeText(copied).catch((err) =>
        console.error('[import-ide] clipboard write failed', err),
      )
      applyEdit(next, nextStart)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      // Multi-line selection (or any selection that spans a newline) →
      // indent / unindent every affected line. Single-line cursor keeps
      // the classic "insert spaces at caret" behaviour.
      const multi = hasSelection && raw.slice(start, end).includes('\n')
      if (e.shiftKey) {
        const { next, nextStart, nextEnd } = unindentLines(raw, start, end)
        applyEdit(next, nextStart, nextEnd)
        return
      }
      if (multi) {
        const { next, nextStart, nextEnd } = indentLines(raw, start, end)
        applyEdit(next, nextStart, nextEnd)
        return
      }
      const next = raw.slice(0, start) + INDENT + raw.slice(end)
      applyEdit(next, start + INDENT_LEN)
      return
    }
  }

  // Keep the line-number gutter AND the syntax-highlight overlay
  // scroll-locked to the textarea so neither drifts as the editor
  // scrolls. The textarea is the source of truth for scroll position
  // (it's the element the user actually interacts with).
  function onEditorScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    const top = e.currentTarget.scrollTop
    const left = e.currentTarget.scrollLeft
    if (gutterRef.current) gutterRef.current.scrollTop = top
    if (overlayRef.current) {
      overlayRef.current.scrollTop = top
      overlayRef.current.scrollLeft = left
    }
  }

  const lineNumbers = useMemo(() => {
    const n = raw.split('\n').length || 1
    return Array.from({ length: n }, (_, i) => i + 1)
  }, [raw])

  // Tokenise the editor content once per change for the overlay. Cheap
  // (regex per line, no DOM until React renders) but worth memoising
  // since the overlay re-renders on every keystroke alongside the
  // textarea.
  const highlighted = useMemo(() => highlightToon(raw), [raw])

  return (
    <div
      className="flex flex-col gap-3"
      data-test-id="admin-restaurants-import-ide"
    >
      <StatusBar state={state} stale={isStale} />

      <div
        className="flex rounded border border-[var(--ink-14)] p-1 text-xs sm:hidden"
        role="tablist"
        aria-label="Painel"
      >
        <TabBtn active={tab === 'code'} onClick={() => setTab('code')}>
          Código
        </TabBtn>
        <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')}>
          Preview
        </TabBtn>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section
          className={`${tab === 'code' ? 'block' : 'hidden'} sm:block`}
          aria-label="Editor JSON"
        >
          <div className="flex h-[min(72vh,640px)] overflow-hidden rounded border border-[var(--ink-14)] bg-[var(--paper)]">
            <pre
              ref={gutterRef}
              aria-hidden="true"
              className="select-none overflow-hidden border-r border-[var(--ink-14)] bg-[var(--ink-04,transparent)] py-3 text-right font-mono text-xs leading-relaxed text-[var(--ink-40)]"
              style={{ minWidth: `${String(lineNumbers.length).length + 2}ch` }}
            >
              {lineNumbers.map((n) => {
                const isErr =
                  state.kind === 'invalid' && state.errorLine === n
                return (
                  <div
                    key={n}
                    className={`px-2 ${
                      isErr
                        ? 'bg-[var(--cinnabar-15)] font-semibold text-[var(--cinnabar)]'
                        : ''
                    }`}
                  >
                    {n}
                  </div>
                )
              })}
            </pre>
            {/* Overlay editor: transparent textarea on top, colourised
                <pre> below. Both share IDENTICAL metrics (font, size,
                line-height, padding, wrap mode) so the textarea's caret
                + selection stay aligned with the highlighted layer. */}
            <div className="relative flex-1">
              <pre
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed"
                ref={overlayRef}
              >
                {highlighted}
              </pre>
              <textarea
                ref={editorRef}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                onKeyDown={onEditorKeyDown}
                onScroll={onEditorScroll}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="TOON do restaurante"
                placeholder={'Cola o TOON aqui ou carrega em "Exemplo".'}
                className="relative block h-full w-full resize-none whitespace-pre-wrap break-words bg-transparent p-3 font-mono text-xs leading-relaxed text-transparent caret-[var(--ink)] outline-none selection:bg-[var(--ink-14)] selection:text-transparent"
                data-test-id="admin-restaurants-import-editor"
              />
            </div>
          </div>
        </section>

        <section
          className={`${tab === 'preview' ? 'block' : 'hidden'} sm:block`}
          aria-label="Pré-visualização"
        >
          <div
            className="flex h-[min(72vh,640px)] flex-col rounded border border-[var(--ink-14)] bg-[var(--paper)]"
            data-test-id="admin-restaurants-import-preview-pane"
          >
            <PreviewPane
              state={state}
              previewLang={previewLang}
              onLangChange={setPreviewLang}
              viewport={viewport}
              onViewportChange={setViewport}
              onThemeChange={onThemeChange}
            />
          </div>
        </section>
      </div>

      {(serverError || serverIssues.length > 0) && (
        <div
          className="space-y-2 rounded border border-[var(--cinnabar)] bg-[var(--cinnabar-15)] px-3 py-2 text-sm text-[var(--cinnabar)]"
          role="alert"
        >
          {serverError && <p className="font-semibold">{serverError}</p>}
          {serverIssues.length > 0 && (
            <ul className="space-y-1 text-xs">
              {serverIssues.slice(0, 8).map((iss, idx) => (
                <li key={idx}>
                  <code className="font-mono">{iss.path}</code> — {iss.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-[var(--ink-14)] bg-[var(--paper)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ir-example">
            Carregar exemplo
          </label>
          <select
            id="ir-example"
            value=""
            onChange={(e) => {
              const ex = EXAMPLES.find((x) => x.id === e.target.value)
              if (ex) setRaw(exampleAsText(ex))
              e.currentTarget.value = ''
            }}
            className="rounded border border-[var(--ink-14)] bg-[var(--paper)] px-2 py-2 text-xs hover:border-[var(--ink)]"
            data-test-id="admin-restaurants-import-example-picker"
          >
            <option value="" disabled>
              Carregar exemplo…
            </option>
            {EXAMPLES.map((ex) => (
              <option key={ex.id} value={ex.id} title={ex.hint}>
                {ex.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={copyLlmPrompt}
            className="rounded border border-[var(--ink-14)] px-3 py-2 text-xs hover:border-[var(--ink)]"
            title="Copia para o clipboard um prompt completo (schema + regras + exemplos) para colar num LLM"
            data-test-id="admin-restaurants-import-copy-prompt"
          >
            {copied ? '✓ Copiado' : 'Copiar prompt LLM'}
          </button>
          <button
            type="button"
            onClick={onFormat}
            disabled={raw.trim().length === 0}
            className="rounded border border-[var(--ink-14)] px-3 py-2 text-xs hover:border-[var(--ink)] disabled:opacity-40"
            title="Format TOON (Cmd/Ctrl+Shift+F)"
            data-test-id="admin-restaurants-import-format"
          >
            Format
          </button>
          <button
            type="button"
            onClick={() => {
              setRaw('')
              setServerError(null)
              setServerIssues([])
            }}
            disabled={raw.length === 0}
            className="rounded border border-[var(--ink-14)] px-3 py-2 text-xs hover:border-[var(--ink)] disabled:opacity-40"
            data-test-id="admin-restaurants-import-clear"
          >
            Limpar
          </button>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={state.kind !== 'valid' || submitting}
          className="w-full rounded bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--paper)] disabled:opacity-50 sm:w-auto"
          data-test-id="admin-restaurants-import-submit"
        >
          {submitting ? 'A criar…' : 'Criar restaurante'}
        </button>
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded px-3 py-2 text-xs ${
        active
          ? 'bg-[var(--ink)] text-[var(--paper)]'
          : 'text-[var(--ink-55)]'
      }`}
    >
      {children}
    </button>
  )
}

function StatusBar({ state, stale }: { state: ValidState; stale: boolean }) {
  const dot =
    state.kind === 'valid'
      ? 'bg-[var(--malachite,#2ecc71)]'
      : state.kind === 'invalid'
        ? 'bg-[var(--cinnabar)]'
        : 'bg-[var(--ink-40)]'
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded border border-[var(--ink-14)] bg-[var(--paper)] px-3 py-2 text-xs"
      role="status"
      aria-live="polite"
      data-test-id="admin-restaurants-import-status"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`inline-block h-2 w-2 rounded-full ${dot} ${
            stale ? 'opacity-50' : ''
          }`}
        />
        {state.kind === 'empty' && (
          <span className="text-[var(--ink-55)]">Vazio</span>
        )}
        {state.kind === 'invalid' && (
          <span className="text-[var(--cinnabar)]">
            {state.issues.length > 0
              ? `${state.issues.length} erro${state.issues.length === 1 ? '' : 's'} de schema`
              : state.errorLine
                ? `Sintaxe inválida na linha ${state.errorLine}`
                : state.error}
          </span>
        )}
        {state.kind === 'valid' && <span>Válido</span>}
      </span>
      {state.kind === 'valid' && (
        <>
          <span className="text-[var(--ink-40)]">·</span>
          <span className="text-[var(--ink-55)]" translate="no">
            {state.data.user.email}
          </span>
          <span className="text-[var(--ink-40)]">·</span>
          <span className="text-[var(--ink-55)]">
            plano {state.data.tenant.plan}
          </span>
          <span className="text-[var(--ink-40)]">·</span>
          <span className="text-[var(--ink-55)]">
            {state.data.menu.categories.length} categoria
            {state.data.menu.categories.length === 1 ? '' : 's'}
          </span>
          <span className="text-[var(--ink-40)]">·</span>
          <span className="text-[var(--ink-55)]">
            {state.data.menu.categories.reduce(
              (a, c) => a + c.items.length,
              0,
            )}{' '}
            items
          </span>
        </>
      )}
    </div>
  )
}

function PreviewPane({
  state,
  previewLang,
  onLangChange,
  viewport,
  onViewportChange,
  onThemeChange,
}: {
  state: ValidState
  previewLang: LanguageCode | null
  onLangChange: (l: LanguageCode | null) => void
  viewport: Viewport
  onViewportChange: (v: Viewport) => void
  onThemeChange: (
    key: 'layout' | 'font' | 'primaryColor' | 'secondaryColor',
    value: string,
  ) => void
}) {
  if (state.kind === 'empty') {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--ink-55)]">
        O preview aparece aqui à medida que escreves — vais ver exatamente
        o que o cliente verá na página pública.
      </div>
    )
  }
  if (state.kind === 'invalid') {
    return (
      <div className="space-y-3 overflow-auto p-4 text-sm">
        <p className="font-semibold text-[var(--cinnabar)]">{state.error}</p>
        {state.issues.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {state.issues.slice(0, 20).map((iss, idx) => (
              <li key={idx}>
                <code className="font-mono text-[var(--cinnabar)]">
                  {iss.path}
                </code>
                <span className="text-[var(--ink-55)]"> — {iss.message}</span>
              </li>
            ))}
            {state.issues.length > 20 && (
              <li className="text-[var(--ink-55)]">
                …e mais {state.issues.length - 20}.
              </li>
            )}
          </ul>
        ) : (
          <p className="text-xs text-[var(--ink-55)]">
            JSON malformado — corrige a sintaxe e o preview volta.
          </p>
        )}
      </div>
    )
  }

  const { data } = state
  const supported = data.restaurant.supportedLanguages
  const activeLang: LanguageCode =
    previewLang && (supported as readonly LanguageCode[]).includes(previewLang)
      ? previewLang
      : data.restaurant.defaultLanguage

  const loaded = importToPublicMenuLoaded(data, activeLang)
  const targetWidth = VIEWPORT_WIDTH[viewport]
  const editable = state.kind === 'valid'
  const disabledHint = editable
    ? undefined
    : 'Repara o JSON para editar tema/língua'

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ink-14)] bg-[var(--paper)] px-3 py-2 text-xs">
        <ViewportBtn current={viewport} value="mobile" onChange={onViewportChange}>
          📱 Mobile
        </ViewportBtn>
        <ViewportBtn current={viewport} value="tablet" onChange={onViewportChange}>
          📱 Tablet
        </ViewportBtn>
        <ViewportBtn current={viewport} value="desktop" onChange={onViewportChange}>
          🖥 Desktop
        </ViewportBtn>

        <span className="ml-auto flex items-center gap-2">
          <label
            className={`flex items-center gap-1 ${editable ? 'text-[var(--ink-55)]' : 'text-[var(--ink-40)]'}`}
            title={disabledHint}
          >
            Template
            <select
              value={loaded.theme.layout}
              disabled={!editable}
              onChange={(e) => onThemeChange('layout', e.target.value)}
              className="rounded border border-[var(--ink-14)] bg-[var(--paper)] px-1 py-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              data-test-id="admin-restaurants-import-preview-template"
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}
                </option>
              ))}
            </select>
          </label>
          <label
            className={`flex items-center gap-1 ${editable ? 'text-[var(--ink-55)]' : 'text-[var(--ink-40)]'}`}
            title={disabledHint}
          >
            Font
            <select
              value={loaded.theme.font}
              disabled={!editable}
              onChange={(e) => onThemeChange('font', e.target.value)}
              className="rounded border border-[var(--ink-14)] bg-[var(--paper)] px-1 py-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              data-test-id="admin-restaurants-import-preview-font"
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label
            className={`flex items-center gap-1 ${editable ? 'text-[var(--ink-55)]' : 'text-[var(--ink-40)]'}`}
            title={disabledHint ?? 'Cor primária'}
          >
            Cor
            <input
              type="color"
              value={loaded.theme.primaryColor}
              disabled={!editable}
              onChange={(e) => onThemeChange('primaryColor', e.target.value)}
              className="h-5 w-7 cursor-pointer rounded border border-[var(--ink-14)] bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
              data-test-id="admin-restaurants-import-preview-color"
            />
          </label>
        </span>
      </div>

      <WarningsBanner state={state} />

      <section className="border-b border-[var(--ink-14)] bg-[var(--ink-04,transparent)] px-3 py-2 text-xs">
        <p className="mb-1 uppercase tracking-[0.18em] text-[var(--ink-55)]">
          Provisioning (não visível na página pública)
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-[var(--ink-55)]">Owner</dt>
          <dd translate="no">{data.user.email}</dd>
          <dt className="text-[var(--ink-55)]">Tenant</dt>
          <dd>{data.tenant.name?.trim() || data.restaurant.name}</dd>
          <dt className="text-[var(--ink-55)]">Plano</dt>
          <dd>{data.tenant.plan}</dd>
        </dl>
      </section>

      {/* Viewport simulator: clamp content to the chosen device width,
          centered, with a subtle shadow so it reads as a "phone frame"
          inside the pane. Desktop = pane fills naturally (no clamp). */}
      <div className="flex-1 overflow-auto bg-[var(--ink-04,#f5f5f5)] p-3">
        <div
          className={
            targetWidth
              ? 'mx-auto overflow-hidden rounded-lg border border-[var(--ink-14)] bg-[var(--paper)] shadow-sm'
              : 'h-full bg-[var(--paper)]'
          }
          style={targetWidth ? { width: targetWidth, maxWidth: '100%' } : undefined}
          data-test-id="admin-restaurants-import-preview-frame"
          data-viewport={viewport}
        >
          <PublicMenuView
            data={loaded}
            onLanguageChange={onLangChange}
            showBeacon={false}
          />
        </div>
      </div>
    </>
  )
}

function WarningsBanner({ state }: { state: ValidState }) {
  const warnings = collectWarnings(state)
  if (warnings.length === 0) return null
  return (
    <ul
      className="border-b border-[var(--ink-14)] bg-[var(--paper)] px-3 py-2 text-xs"
      role="status"
      aria-live="polite"
      data-test-id="admin-restaurants-import-preview-warnings"
    >
      {warnings.map((w, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 ${
            w.level === 'error'
              ? 'text-[var(--cinnabar)]'
              : w.level === 'warn'
                ? 'text-[var(--amber,#b45309)]'
                : 'text-[var(--ink-55)]'
          }`}
        >
          <span aria-hidden="true" className="select-none">
            {w.level === 'error' ? '✕' : w.level === 'warn' ? '!' : 'i'}
          </span>
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  )
}

function ViewportBtn({
  current,
  value,
  onChange,
  children,
}: {
  current: Viewport
  value: Viewport
  onChange: (v: Viewport) => void
  children: React.ReactNode
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={active}
      className={`rounded border px-2 py-1 ${
        active
          ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
          : 'border-[var(--ink-14)] text-[var(--ink-55)] hover:border-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  )
}
