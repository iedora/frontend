# Análise de Psicologia de Marketing — iedora

> **Contexto**: Landing page do produto menu (`menu.iedora.com`), landing da marca (`iedora.com`), página de billing, e onboarding.
> **Data**: 2025
> **Metodologia**: Marketing Psychology & Mental Models (skill de referência)

---

## 1. COPY DA LANDING PAGE — Análise psicológica

### 1.1 Hero (acima da dobra)

| Elemento | Texto (EN) | Psicologia aplicada | Oportunidade |
|----------|-----------|---------------------|--------------|
| Eyebrow | `"at the table"` | **Liking/Similarity** — linguagem de insider, posiciona o produto como parte do mundo do restaurante. | ✅ Bem executado |
| Headline | `"One menu. Every screen it lives on."` | **Framing** — enquadra como unificação, não como mais trabalho. **Curse of Knowledge** evitado (simples). | ✅ Forte |
| Tagline | `"Always current. Always honest about the kitchen."` | **Loss Aversion** (evitar desatualização) + **Honestidade** (Pratfall inverso — a qualidade é a honestidade). | ✅ Bom |
| CTA | `"Try it with your menu"` | **Commitment & Consistency** — "your menu" assume posse, ativa endowment effect. | ✅ |
| Trust line | `"Always free for one restaurant · No card · No setup call"` | **Zero-Price Effect** + **Loss Aversion** (sem risco) + **Activation Energy** reduzida. | ✅ Excelente |

**Gaps identificados no Hero:**

- **Social Proof ausente**: "1,000+ restaurants use iedora" ou contador de clientes. A trust-line é boa mas podia incluir um número.
- **Scarcity não usada**: Nada como "join the waitlist" ou "early adopters get [X]". Para um produto novo, scarcity cria desejo mimético.
- **Mere Exposure**: Só uma CTA. Um retargeting com o headline repetido noutro formato ajudaria.

### 1.2 Statement (linha entre hero e pricing)

> `"One QR on the table. The menu behind it changes whenever you want."`

- **Princípio**: **Simplicidade** (Occam's Razor), **Framing** (contraste entre físico estático e digital dinâmico).
- **Psicologia**: **Endowment Effect** (o QR já está na mesa — posse implícita). **Status-Quo Bias** (mudar o menu não requer reimprimir).
- **Oportunidade**: Podia virar headline secundário noutra secção. A comparação implícita com menu em papel é eficaz.
- ✅ Muito bom.

### 1.3 Pricing (dois cards)

| Elemento | Free | Pro (Casa) |
|----------|------|------------|
| Preço | €0 forever | €12/year |
| Desc | "For the corner café…" | "For everyone past a thousand views…" |
| CTA | "Start free" | "Choose Casa" |
| Badge | — | "Recommended" |

**Psicologia de preços presente:**

- **Good-Better (sem Best)**: Apenas dois tiers. O **Paradox of Choice** diz que menos opções = mais decisões. ✅
- **Anchoring Effect**: Free (€0) ancora o valor. Casa (€12) parece razoável em contraste.
- **Charm Pricing**: €12 é redondo — **Rounded-Price Effect** sinaliza premium. Mas €12/ano = €1/mês — podia dizer "€1/month" para **Mental Accounting**.
- **Rule of 100**: Preço baixo (€12), então desconto percentual funcionaria melhor que absoluto — mas não há desconto.
- **Decoy Effect**: Não há decoy explícito. Adicionar um tier "Agency" como decoy no pricing da landing (não só no dashboard) faria o Casa parecer ainda melhor.
- **Loss Aversion**: `"No card on file for the free tier. Cancel Casa anytime."` — remove o medo do compromisso. ✅ Bom.

**Oportunidades no pricing:**

1. **Tagline do Casa**: `"€1/month"` em vez de `"€12/year"` — **Mental Accounting** (café pequeno vs. jantar fora). Cada custo baixo parece mais acessível.
2. **Adicionar terceiro card (Agency) como decoy na landing**: "For teams" — sem badge, preço alto (€49/mês?). Faz o Casa parecer óbvio.
3. **Ancoragem visual**: O card Free está à esquerda, Casa à direita. Estudos mostram que olhos leem esquerda→direita; Free ancora, Casa beneficia do contraste. ✅ Posição correta.
4. **Escassez**: "First 100 restaurants lock in this price" ou algo do género.

### 1.4 Closing (secção final)

| Elemento | Texto | Psicologia |
|----------|-------|-----------|
| Eyebrow | `"at the table"` | Consistência temática |
| Headline | `"Put your menu online this afternoon."` | **Hyperbolic Discounting** — benefício imediato ("this afternoon"). **Activation Energy** baixa (horas, não dias). |
| CTA | `"Bring your menu over"` | **Loss Aversion** implícita (o menu é deles, não estamos a pedir para criar de novo). **Endowment Effect** (o menu que já têm). |

✅ O closing é forte porque repete o CTA primário e reduz a fricção mental.

### 1.5 Footer

> `"Menu · an iedora product · made in Lisbon"` + email

- **Liking/Similarity**: "Made in Lisbon" evoca autenticidade, craft. Constrói confiança.
- **Authority Bias**: Associar-se à marca iedora (mesmo que pequena) dá credibilidade.
- O email `hi@iedora.com` é humano e acessível — **Reciprocity** implícita.

---

## 2. LANDING DA MARCA (iedora.com / house/page.tsx)

**Copy atual:**
> Headline: `"We do software with quality."`
> Tagline: `"A small house in Oporto and Lisboa. Patient work, quiet interfaces."`
> CTAs: "See our first product — menu" + "Write to hi@iedora.com"

**Análise psicológica:**

| Princípio | Presente? | Notas |
|-----------|-----------|-------|
| **Liking/Similarity** | ✅ | "Small house", "patient work" — posicionamento artesanal |
| **Pratfall Effect** | ✅ | "Small" é humilde, não megalómano. Pequena fraqueza (somos pequenos) aumenta confiança. |
| **Authority Bias** | ❌ | Não há números, clientes, nem provas sociais. |
| **Social Proof** | ❌ | Nenhum. Quem usa iedora? |
| **Curse of Knowledge** | ✅ Evitado | Copy simples, sem jargão. |
| **Peak-End Rule** | ❌ Fim fraco | O CTA "Write to hi@iedora.com" é passivo. Não termina com um momento forte. |

**Oportunidades:**
1. **Social Proof mínimo**: "Trusted by N restaurants across Portugal."
2. **CTA final mais forte**: Em vez de email, "See Menu in action →" que vai para uma demo.
3. **Endowment Effect**: "Your restaurant's menu, online in 5 minutes."
4. **Peak-End**: A experiência termina no CTA do email — fraco. Podia ter um "Get started" no fim.

---

## 3. AUDITORIA DE PRICING — Psicologia de preços

### 3.1 Estrutura atual

```
Free (€0/mês)          → 1 restaurante, 1000 views/mês
Pro / Casa (€12/ano)   → 3 restaurantes, 20000 views/mês, analytics, PDF
Agency (dashboard only)→ Ilimitado, sem views
```

### 3.2 O que está a funcionar

| Princípio | Como |
|-----------|------|
| **Zero-Price Effect** | Free a €0 é psicologicamente muito diferente de €1. Atrai registos. |
| **Good-Better-Best** | Três tiers (Free → Pro → Agency) — o clássico **Price Relativity**. |
| **Default Effect** | Free é default (isDefault: true). Reduz fricção no registo. |
| **Anchoring** | Free ancora em €0; Pro parece uma pequena subida. Agency ancora em cima. |
| **Decoy (implícito)** | Agency serve de decoy para Pro no dashboard. |

### 3.3 O que pode ser melhorado

| Oportunidade | Problema | Sugestão |
|-------------|----------|----------|
| **Mental Accounting** | €12/year apresentado como total. | Mostrar como `€1/month` no card. O cérebro processa "1 café" vs. "12 euros". |
| **Rule of 100** | Não aplicada (não há descontos). | Na black friday: Free anual (€0 igual), Pro "50% off" → €6/ano. |
| **Framing do Pro** | "For everyone past a thousand views" é bom mas podia ser mais aspiracional. | "For restaurants that outgrew the corner café. Analytics, PDF export, branded URLs." |
| **Scarcity no Agency** | Sempre disponível. | "Agency plan — contact us" em vez de preço aberto. Escassez + Authority. |

### 3.4 Comparação com concorrentes psicológicos

Concorrentes como GloriaFood, MenuDrive, Toast usam:
- **GloriaFood**: Free + "Pro" a $29/mês -> Decoy: gap enorme entre free e pro.
- **Toast**: Não mostra preço -> **Anchoring** fraco (sem âncora).
- **iDoor**: €19/mês.

A iedora com €12/ano vs. €29/mês da concorrência é uma vantagem de **framing dramática**. Devia ser mais explorada:
> "€12/year — less than what others charge in a month."

---

## 4. ONBOARDING — Análise comportamental

### 4.1 Fluxo atual

```
Sign up → Step 1: "What shall we call the house?" (nome + tagline)
        → Step 2: "Build your menu" (sample menu ou manual)
        → Dashboard
```

### 4.2 Psicologia aplicada

| Princípio | Onde | Notas |
|-----------|------|-------|
| **Goal-Gradient Effect** | DottedStepper (Step 1 of 2) | ✅ Progresso visível acelera motivação. |
| **Zeigarnik Effect** | Step 1 → Step 2 | A barra de progresso cria tensão por completar. ✅ |
| **Commitment & Consistency** | Step 1 (nome do restaurante) | Compromisso pequeno (dar nome) leva a compromissos maiores. ✅ |
| **IKEA Effect** | Step 2 (construir menu) | "Start with a ready-made sample" + opção de criar manualmente. O esforço de criar aumenta valor percebido. ✅ |
| **Activation Energy** | Formulário de 2 campos | ✅ Mínimo possível. Nome (obrigatório) + tagline (opcional). |
| **Default Effect** | Sample menu pré-selecionado | "Start with a ready-made sample menu" — mas é escolha ativa, não default. Podia ser **opt-out** em vez de **opt-in**. |
| **Foot-in-the-Door** | Nome → Menu → Dashboard | Pequenos passos que escalam. ✅ |

### 4.3 Oportunidades no onboarding

1. **Default Effect no sample menu**: Em vez de "Skip — I'll add dishes manually" com o sample como CTA principal, podia ser "I'll add dishes manually (advanced)" como link secundário. O sample devia ser o **caminho predefinido** — a maioria dos users quer ver resultados rápido.

2. **Goal-Gradient reforçado**: Quando o user completa o nome, mostrar uma transição animada "✅ Restaurant created! Now let's build the menu." para reforçar o progresso.

3. **BJ Fogg — Prompt**: O onboarding não tem trigger pós-registo além da submissão. Podia ter:
   - Email de boas-vindas com link direto para Step 2
   - Notificação no browser (se permitido)

4. **Loss Aversion na saída**: "You're 50% there. Don't lose your progress." se tentarem sair.

5. **Endowment Effect cedo**: Depois de dar nome ao restaurante, mostrar preview do menu com nome deles já visível. A posse emocional começa antes do menu estar feito.

---

## 5. BILLING PAGE — Dashboard interno

### 5.1 Copy atual

```
Free:   "Get started with one restaurant."
Pro:    "Everything in Free, plus the tools to grow." (badge: Recommended)
Agency: "Unlimited restaurants for teams managing many venues."
```

### 5.2 Psicologia

| Princípio | Notas |
|-----------|-------|
| **Social Proof (implícito)** | "Recommended" badge no Pro guia escolha. ✅ |
| **Anchoring** | Free → Pro → Agency cria escada. ✅ |
| **Default Effect** | Free é default. ❌ Para conversão, Pro devia ser default visualmente. |
| **Loss Aversion** | Não há "what you're missing" no card Free. Mostrar o que o Free NÃO tem (visto como perda) motiva upgrade. |
| **Paradox of Choice** | Só 3 tiers — ✅ bom. |

### 5.3 Melhorias

1. **Pro como default visual**: Card do Pro mais destacado, com "Most popular" em vez de "Recommended".
2. **Loss Aversion no Free**: Em vez de "Get started with one restaurant", mostrar as features que faltam como "🚫 Custom branding" em tom mais claro — a ausência dói mais que a presença agrada.
3. **Contraste com concorrentes**: "Less than what others charge per month" ao lado do preço do Pro.
4. **Scarcity**: "Limited-time launch pricing" — se aplicável.

---

## 6. MAPA DE MODELOS MENTAIS — O que está presente vs. ausente

### Presente (✅)

- Zero-Price Effect (Free)
- Anchoring (preços)
- Framing (headlines)
- Commitment & Consistency (onboarding steps)
- Activation Energy reduzida (formulários simples)
- Goal-Gradient (stepper)
- Paradox of Choice evitado (3 tiers, 2 campos)
- Hyperbolic Discounting ("this afternoon")
- IKEA Effect (build your menu)
- Pratfall Effect (small house, honest)
- Loss Aversion (trust line, "no card")

### Ausente ou sub-utilizado (⬜)

| Modelo | Onde aplicar | Impacto potencial |
|--------|-------------|-------------------|
| **Social Proof** | Hero da landing + house + billing | **Alto** — número de restaurantes, citações, logos |
| **Scarcity** | Pricing (launch pricing, limited slots) | **Médio-Alto** — acelera decisão |
| **Mimetic Desire** | Testemunhos de "restaurantes como o teu" | **Alto** — "O Pastéis de Belém usa" |
| **Peak-End Rule** | Fim do onboarding / closing | **Médio** — momento memorável (confetti, "your menu is live!") |
| **Decoy Effect** | Landing sem Agency — adicionar como decoy | **Médio** — faz Pro parecer óbvio |
| **Mental Accounting** | €12/year vs €1/month | **Médio** — perceção de custo mais baixo |
| **Default Effect** | Sample menu como opt-out; Pro como default no billing | **Médio-Alto** — guia escolhas sem fricção |
| **Endowment Effect** | Preview do menu com nome do restaurante antes de publicar | **Médio** — ligação emocional mais cedo |
| **Authority Bias** | "Featured in" ou menções na comunicação | **Baixo-Médio** — depende de ter cobertura |
| **BJ Fogg — Prompt** | Notificações pós-registo | **Médio** — recupera abandonos no onboarding |
| **Cobra Effect** | Cuidado: if "start free" gera muitos trials que não convertem | **Preventivo** — monitorizar taxa free→pro |

---

## 7. RECOMENDAÇÕES PRIORIZADAS

### 🟢 Fácil / Rápido (horas)

1. **Social Proof**: Adicionar "N restaurants in Portugal use Menu by iedora" no hero ou footer da landing (dados do backend).
2. **Mental Accounting**: Mudar `€12/year` para `€1/month` — e atualizar o subtítulo para `"/month, billed yearly"`.
3. **Pro como default**: No card do Casa, usar `data-recommended` com estilo visual mais forte (borda, sombra).
4. **Tagline do Pro**: "For restaurants that outgrew the corner café" — substitui "For everyone past a thousand views" que é limitativo.
5. **Fim do onboarding com Peak-End**: Animação simples ou mensagem de celebração quando o primeiro menu fica online.

### 🟡 Médio (1-2 dias)

6. **Default Effect no sample menu**: Trocar a lógica — sample menu é default (opt-out), criação manual é link secundário.
7. **Decoy na landing**: Adicionar card Agency na página de pricing da landing (não só no dashboard) com preço mais alto.
8. **Loss Aversion no Free card**: Mostrar "✕ Custom branding" e "✕ Analytics" (o que estão a perder) em tom suave.
9. **Nudge de upgrade**: No dashboard, quando o free atinge ~80% das views, mostrar nudge com barra de progresso (Goal-Gradient).

### 🔴 Complexo (3-5 dias)

10. **Testemunhos na landing**: Secção de "Who's using it" com citações reais + foto do restaurante.
11. **Onboarding com preview ao vivo**: Após dar nome, mostrar preview em tempo real do menu deles com o nome visível.
12. **Sequência de emails onboarding**: 3 emails — (1) "Your menu is waiting" (triggers BJ Fogg - Prompt), (2) "Ideas for your first section" (social proof + inspiração), (3) "Your menu is live!" (Peak-End + endowment).

---

## 8. CHECKLIST RÁPIDO — Novas funcionalidades ou copy

| Ao criar… | Pergunta psicológica |
|-----------|---------------------|
| CTA | Que perda imediata evitam? (Loss Aversion) |
| Preço | Qual a âncora? Há decoy? (Anchoring, Decoy) |
| Headline | É sobre o cliente, não sobre o produto? (Framing) |
| Formulário | Quantos campos? Menos de 3? (Activation Energy) |
| Upgrade | O que estão a perder? (Loss Aversion) |
| Onboarding | Vêem progresso? (Goal-Gradient) |
| Email | Qual o trigger? (BJ Fogg - Prompt) |
| Testemunho | Quem? Similar ao target? (Mimetic Desire) |
| Pricing | Primeiro número que veem? (Anchoring) |
| Footer | Termina bem? (Peak-End Rule) |

---

*Documento gerado com base na framework Marketing Psychology & Mental Models.*
*Revisão periódica recomendada: a cada 3 meses ou após cada campanha major.*
