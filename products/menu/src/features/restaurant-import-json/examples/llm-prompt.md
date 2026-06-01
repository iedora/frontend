# LLM prompt

O prompt completo (schema + regras + os 5 exemplos abaixo embebidos) é **construído em runtime** a partir destes JSONs. Source of truth única — nada de copies.

## Como obter o prompt

- **Na IDE de import** (`/menu/dashboard/admin/restaurants/import`): botão **"Copiar prompt LLM"** mete o prompt no clipboard.
- **No código**: `import { LLM_PROMPT, EXAMPLES } from '@iedora/product-menu/features/restaurant-import-json/examples'`.

## Como usar

1. Copia o prompt
2. Cola num LLM (Claude, ChatGPT, Gemini)
3. Adiciona em baixo a informação do restaurante (PDF do menu, foto, lista de pratos)
4. O LLM devolve um JSON
5. Cola o JSON na IDE

## Exemplos (single source of truth)

Cada ficheiro valida 100% no `restaurantImportSchema` e é incluído tanto no picker da IDE como no prompt LLM.

| # | Ficheiro | Plano | Línguas | Destaque |
|---|---|---|---|---|
| 01 | [`01-cafe-pastelaria.json`](./01-cafe-pastelaria.json) | free | pt | Single-language, mínimo viável |
| 02 | [`02-trattoria-italian.json`](./02-trattoria-italian.json) | casa | pt + en | i18n bilingual, variantes |
| 03 | [`03-cervejaria-pt.json`](./03-cervejaria-pt.json) | casa | pt + en + es | Variantes complexas, 3 línguas |
| 04 | [`04-vegan-bowl.json`](./04-vegan-bowl.json) | casa | pt + en + es + fr | 4 línguas completas, tags |
| 05 | [`05-sushi-omakase.json`](./05-sushi-omakase.json) | casa | pt + en + fr | `available:false`, sazonal |
