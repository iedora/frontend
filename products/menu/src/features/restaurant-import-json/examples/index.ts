/**
 * Examples + LLM prompt for the import IDE.
 *
 * Single source of truth: the `.json` siblings. Both the in-IDE picker AND
 * the copy-to-clipboard LLM prompt read from the same imported modules —
 * no string duplicates to drift.
 *
 * Token efficiency: the LLM prompt embeds only TWO carefully picked
 * examples (`promptIncluded: true`) — the smallest viable case + the
 * most complete case. Those two are encoded as TOON
 * (https://github.com/toon-format/toon) rather than JSON: ~30–60% fewer
 * tokens for uniform arrays (which `items[]` very much are). Output
 * remains plain JSON because that's what the IDE editor expects.
 */

import { encode as toonEncode } from '@toon-format/toon'

import cafe from './01-cafe-pastelaria.json'
import trattoria from './02-trattoria-italian.json'
import cervejaria from './03-cervejaria-pt.json'
import vegan from './04-vegan-bowl.json'
import sushi from './05-sushi-omakase.json'

export type Example = {
  id: string
  label: string
  /** One-line summary used in the picker. */
  hint: string
  /** Parsed JSON. The IDE serializes with `JSON.stringify(data, null, 2)`. */
  data: unknown
  /**
   * Embed this example inside the copied LLM prompt. Keep this set
   * small — every extra example multiplies the input-token cost the
   * admin pays in their LLM chat. Two well-picked examples are enough
   * to teach the schema (minimal + full-feature).
   */
  promptIncluded?: boolean
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'cafe',
    label: 'Pastelaria (PT, mínimo)',
    hint: 'Single-language, 2 categorias, sem variantes',
    data: cafe,
    promptIncluded: true, // minimal viable shape
  },
  {
    id: 'trattoria',
    label: 'Trattoria (PT + EN, variantes)',
    hint: 'Bilingual, descrições traduzidas, sizes',
    data: trattoria,
  },
  {
    id: 'cervejaria',
    label: 'Cervejaria (PT + EN + ES, copo)',
    hint: 'Imperial/caneca/girafa, 3 línguas',
    data: cervejaria,
  },
  {
    id: 'vegan',
    label: 'Vegan bowl (4 línguas)',
    hint: 'PT + EN + ES + FR, tags múltiplas',
    data: vegan,
    promptIncluded: true, // full-feature: 4 langs + tags + theme
  },
  {
    id: 'sushi',
    label: 'Sushi omakase (item indisponível)',
    hint: 'PT + EN + FR, available:false, sazonal',
    data: sushi,
  },
] as const

/**
 * Wire format for the import IDE editor: TOON across the board (input
 * + output + paste). The Drizzle/server side decodes through the same
 * TOON pipeline. JSON is gone from the operator surface.
 */
export function exampleAsText(ex: Example): string {
  return toonEncode(ex.data)
}

const SCHEMA_AND_RULES = `Tu és um conversor de menus de restaurante. Vais receber informação livre sobre um restaurante (nome, pratos, preços, descrições, eventualmente traduções) e tens de devolver **apenas TOON** (Token-Oriented Object Notation) que cumpra exatamente o seguinte schema. Sem markdown fences, sem comentários, sem texto antes ou depois.

> **TOON** é um formato compacto, lossless, equivalente a JSON: indentação por espaços para objetos, e tabelas \`key[N]{col1,col2}:\` + linhas CSV para arrays uniformes. Inspira-te nos exemplos abaixo — replica EXATAMENTE essa sintaxe. A IDE que recebe o teu output sabe decodificar TOON automaticamente. Output em TOON poupa ~30–50% dos tokens vs JSON, o que vale dinheiro real ao admin.

### Schema (TypeScript)

\`\`\`ts
type LanguageCode = 'en' | 'pt' | 'es' | 'fr' // únicos válidos
type LocalizedText = Partial<Record<LanguageCode, string>>

type Variant = { label: string; labelI18n?: LocalizedText; priceCents: number }

type Item = {
  name: string                       // 1–120
  nameI18n?: LocalizedText
  description?: string               // 0–500
  descriptionI18n?: LocalizedText
  priceCents: number                 // INT em cêntimos. 6,50€ → 650. NUNCA decimais.
  currency?: string                  // ISO-4217. Default 'EUR'.
  imageUrl?: string                  // URL absoluto
  available?: boolean                // default true
  tags?: string[]                    // max 20, minúsculas
  variants?: Variant[]               // max 20
}

type Category = {
  name: string; nameI18n?: LocalizedText
  description?: string; descriptionI18n?: LocalizedText
  items: Item[]                      // max 500
}

type Menu = {
  name: string; nameI18n?: LocalizedText
  description?: string; descriptionI18n?: LocalizedText
  categories: Category[]             // max 100
}

type Theme = {
  primaryColor?: string              // hex "#c0392b"
  secondaryColor?: string
  font?: 'inter' | 'playfair' | 'lora' | 'space-grotesk'
  layout?: 'classic' | 'minimal' | 'editorial' | 'cards'
}

type Restaurant = {
  name: string
  description?: string; descriptionI18n?: LocalizedText
  logoUrl?: string; bannerUrl?: string
  defaultLanguage: LanguageCode      // default 'en'
  supportedLanguages: LanguageCode[] // min 1
  theme?: Theme
}

type User = { email: string; password: string; name?: string }     // password min 8
type Tenant = { name?: string; plan: 'free' | 'casa' }             // default plan 'free'

type Payload = { user: User; tenant: Tenant; restaurant: Restaurant; menu: Menu }
\`\`\`

### Regras de ouro

1. **Preços em INTEGER CÊNTIMOS.** 6,50 € → \`650\`. 12 € → \`1200\`. 0,90 € → \`90\`. Nunca floats. Nunca strings.
2. **defaultLanguage** indica a língua dos campos plain (\`name\`, \`description\`). Os \`*I18n\` são **overrides** para as outras línguas em \`supportedLanguages\`. Menu só PT → \`defaultLanguage: 'pt'\`, \`supportedLanguages: ['pt']\`, sem \`*I18n\`.
3. **Adiciona traduções \`*I18n\`** sempre que tiveres — ou conseguires inferir com segurança — para as línguas em \`supportedLanguages\` (excluindo a default).
4. **Variants** para tamanhos/doses/copos do MESMO prato (Pequena/Grande, Meia dose/Dose, 0.33L/0.5L). Para pratos diferentes, cria items separados. **Quando um item tem \`variants\`, o \`priceCents\` principal NÃO é mostrado na página pública** — o renderer assume que toda a informação de preço está dentro de \`variants\`. Portanto: inclui SEMPRE a opção "regular" como uma variant (ex: variants=[{label:"Pequena", priceCents:650}, {label:"Grande", priceCents:950}] com priceCents:650). Para items sem variantes mantém só \`priceCents\`.
5. **Tags** curtas, categóricas, minúsculas: "vegetariano", "vegan", "sem glúten", "picante", "sazonal", "novidade". Sem emojis.
6. **Email & password** do owner: se não forem fornecidos, usa \`owner@<slug>.example.com\` + \`change-me-1234\`. Não escrevas avisos fora do bloco — o output é APENAS TOON.
7. **Tenant.name** opcional — omite se igual a restaurant.name.
8. **Output: APENAS TOON.** Nada de fences markdown. Nada de texto antes ou depois. Sem \`\`\`toon\`\`\`. Apenas o conteúdo.
`

/**
 * Self-contained prompt: schema + rules + the `promptIncluded` subset of
 * examples, embedded as TOON for token efficiency. Copy to clipboard,
 * paste into Claude/ChatGPT/Gemini, add the restaurant info, get back
 * JSON.
 *
 * Computed lazily from `EXAMPLES` — exactly one source of truth and
 * exactly one TOON encode per page load.
 */
export const LLM_PROMPT: string = (() => {
  const inPrompt = EXAMPLES.filter((e) => e.promptIncluded)
  const examples = inPrompt
    .map(
      (ex, i) =>
        `#### Exemplo ${i + 1}: ${ex.label}\n_${ex.hint}_\n\n\`\`\`toon\n${toonEncode(ex.data)}\n\`\`\``,
    )
    .join('\n\n')
  return `${SCHEMA_AND_RULES}
### Exemplos de referência

${examples}

---

Informação do restaurante (cola abaixo):

`
})()
