import { describe, expect, it } from 'vitest'
import { decode as toonDecode } from '@toon-format/toon'
import { restaurantImportSchema } from '../schema'
import { EXAMPLES, LLM_PROMPT, exampleAsText } from './index'

describe('EXAMPLES · prompt subset', () => {
  it('embeds at least two examples in the prompt', () => {
    // The picker stays at 5 — but the prompt is the cost-sensitive
    // surface. Two well-picked is the minimum to teach the schema.
    const subset = EXAMPLES.filter((e) => e.promptIncluded)
    expect(subset.length).toBeGreaterThanOrEqual(2)
  })

  it('embeds at most three (keeps the prompt cheap)', () => {
    const subset = EXAMPLES.filter((e) => e.promptIncluded)
    expect(subset.length).toBeLessThanOrEqual(3)
  })

  it('exampleAsText round-trips through TOON decode cleanly', () => {
    for (const ex of EXAMPLES) {
      expect(() => toonDecode(exampleAsText(ex))).not.toThrow()
    }
  })

  it('exampleAsText emits TOON, not JSON', () => {
    for (const ex of EXAMPLES) {
      const txt = exampleAsText(ex)
      // TOON starts with a bare key; JSON would start with `{` or `[`.
      const trimmed = txt.trim()
      expect(trimmed.startsWith('{')).toBe(false)
      expect(trimmed.startsWith('[')).toBe(false)
      // Sanity: round-trips back through the TOON decoder.
      expect(() => toonDecode(txt)).not.toThrow()
    }
  })

  it('at least one example uses the TOON tabular array syntax', () => {
    // Encoders only emit `[N]{cols}:` when an array is uniform — guards
    // against a regression where we accidentally feed non-uniform shapes
    // and lose the main token saving.
    const anyTabular = EXAMPLES.some((ex) =>
      /\[\d+\]\{/.test(exampleAsText(ex)),
    )
    expect(anyTabular).toBe(true)
  })
})

describe('LLM_PROMPT', () => {
  it('contains the schema header (so LLMs see the type definitions)', () => {
    expect(LLM_PROMPT).toContain('### Schema (TypeScript)')
    expect(LLM_PROMPT).toContain('### Regras de ouro')
  })

  it('mentions the TOON format and instructs LLM to reply in TOON', () => {
    expect(LLM_PROMPT).toContain('TOON')
    expect(LLM_PROMPT).toMatch(/APENAS TOON/i)
    // Make sure we DON'T accidentally ask for JSON back — that was the
    // old behaviour and would burn ~50% extra output tokens.
    expect(LLM_PROMPT).not.toMatch(/respondes em JSON|return JSON|output JSON/i)
  })

  it('embeds the promptIncluded examples (and only those)', () => {
    const subset = EXAMPLES.filter((e) => e.promptIncluded)
    for (const ex of subset) {
      expect(LLM_PROMPT).toContain(ex.label)
    }
    const excluded = EXAMPLES.filter((e) => !e.promptIncluded)
    for (const ex of excluded) {
      expect(LLM_PROMPT).not.toContain(ex.label)
    }
  })

  it('embeds examples in TOON (not raw JSON braces)', () => {
    // Spot-check: TOON tables write `items[N]{key1,key2}:` headers.
    expect(LLM_PROMPT).toMatch(/items\[\d+\]\{/)
  })

  it('TOON encoding round-trips back to the same parsed shape', () => {
    // Pull every promptIncluded example back out of the prompt and
    // re-validate. Guards against TOON encoding accidentally dropping
    // fields, or against the prompt structure drifting away from the
    // `\`\`\`toon ... \`\`\`` fence convention.
    const blocks = LLM_PROMPT.match(/```toon\n([\s\S]*?)```/g)
    const inPrompt = EXAMPLES.filter((e) => e.promptIncluded)
    expect(blocks).not.toBeNull()
    expect(blocks!.length).toBe(inPrompt.length)
    for (const fenced of blocks!) {
      const body = fenced.replace(/^```toon\n/, '').replace(/```$/, '')
      const decoded = toonDecode(body)
      const result = restaurantImportSchema.safeParse(decoded)
      if (!result.success) console.error(result.error.issues)
      expect(result.success).toBe(true)
    }
  })

  // ── Token-budget regression guard ────────────────────────────────────
  // Baseline (Dec 2026): 5 examples × JSON = ~4 400 tokens. After the
  // trim-to-2 + TOON migration we landed at ~1 800. Cap at 2 200 so a
  // regression (adding a third example, switching back to JSON, bloating
  // the schema text) is loud + obvious in CI before it ships.
  it('stays under the token budget (~2 200 estimated)', () => {
    const estimatedTokens = Math.round(LLM_PROMPT.length / 4)
    expect(estimatedTokens).toBeLessThan(2200)
  })

  it('still includes the placeholder where the admin pastes restaurant info', () => {
    expect(LLM_PROMPT).toMatch(/Informa..o do restaurante/i)
  })
})
