import type { PatchCurrentMenu, PatchOperation } from '../ports'

/**
 * Walks `current` + the selected subset of `operations` and builds a
 * unified category tree where every row knows its diff state. The
 * preview renders THIS tree (not the raw operations) so the operator
 * sees the menu the way their guests will after Apply — with markers
 * for what changed.
 */
export type DiffState = 'unchanged' | 'added' | 'updated' | 'removed'

export type ProposedVariant = { label: string; priceCents: number }

export type ProposedItem = {
  rowKey: string
  name: string
  priceCents: number
  description?: string
  variants?: ProposedVariant[]
  state: DiffState
  /** Original values when state==='updated'. */
  original?: {
    name: string
    priceCents: number
    variants?: ProposedVariant[]
  }
  /** Index in operations[] for the controlling op (null when unchanged). */
  opIndex: number | null
}

export type ProposedCategory = {
  rowKey: string
  name: string
  state: DiffState
  original?: { name: string }
  opIndex: number | null
  items: ProposedItem[]
}

export function buildProposedTree(
  current: PatchCurrentMenu,
  operations: PatchOperation[],
  selected: ReadonlySet<number>,
): ProposedCategory[] {
  // Seed with the current menu — every row starts unchanged.
  const tree: ProposedCategory[] = current.categories.map((c) => ({
    rowKey: `cat:${c.id}`,
    name: c.name,
    state: 'unchanged',
    opIndex: null,
    items: c.items.map((it) => ({
      rowKey: `item:${it.id}`,
      name: it.name,
      priceCents: it.priceCents,
      ...(it.variants && it.variants.length > 0
        ? {
            variants: it.variants.map((v) => ({
              label: v.label,
              priceCents: v.priceCents,
            })),
          }
        : {}),
      state: 'unchanged',
      opIndex: null,
    })),
  }))

  // Track newly-added categories by name so subsequent add-item ops
  // with `categoryName` find them.
  const addedCatByName = new Map<string, ProposedCategory>()

  operations.forEach((op, idx) => {
    if (!selected.has(idx)) return

    switch (op.kind) {
      case 'add-category': {
        const newCat: ProposedCategory = {
          rowKey: `cat:new:${idx}`,
          name: op.name,
          state: 'added',
          opIndex: idx,
          items: op.items.map((it, j) => ({
            rowKey: `item:new:${idx}:${j}`,
            name: it.name,
            priceCents: it.priceCents,
            description: it.description,
            ...(it.variants && it.variants.length > 0 ? { variants: it.variants } : {}),
            state: 'added',
            opIndex: idx,
          })),
        }
        tree.push(newCat)
        addedCatByName.set(op.name, newCat)
        break
      }
      case 'rename-category': {
        const cat = tree.find((c) => c.opIndex === null && c.rowKey === `cat:${op.categoryId}`)
        if (cat) {
          cat.original = { name: cat.name }
          cat.name = op.name
          cat.state = 'updated'
          cat.opIndex = idx
        }
        break
      }
      case 'remove-category': {
        const cat = tree.find((c) => c.opIndex === null && c.rowKey === `cat:${op.categoryId}`)
        if (cat) {
          cat.state = 'removed'
          cat.opIndex = idx
        }
        break
      }
      case 'add-item': {
        const target =
          (op.categoryId &&
            tree.find((c) => c.rowKey === `cat:${op.categoryId}`)) ||
          (op.categoryName && addedCatByName.get(op.categoryName)) ||
          tree[0]
        if (target) {
          target.items.push({
            rowKey: `item:new:${idx}`,
            name: op.name,
            priceCents: op.priceCents,
            description: op.description,
            ...(op.variants && op.variants.length > 0 ? { variants: op.variants } : {}),
            state: 'added',
            opIndex: idx,
          })
        }
        break
      }
      case 'update-item': {
        for (const cat of tree) {
          const it = cat.items.find((i) => i.rowKey === `item:${op.itemId}`)
          if (it) {
            it.original = {
              name: it.name,
              priceCents: it.priceCents,
              ...(it.variants ? { variants: it.variants } : {}),
            }
            if (op.name !== undefined) it.name = op.name
            if (op.priceCents !== undefined) it.priceCents = op.priceCents
            if (op.description !== undefined) it.description = op.description
            // Variants is a FULL replacement when present (matches the
            // adapter's apply semantics); pass `[]` to clear.
            if (op.variants !== undefined) {
              it.variants =
                op.variants.length > 0
                  ? op.variants.map((v) => ({
                      label: v.label,
                      priceCents: v.priceCents,
                    }))
                  : undefined
            }
            it.state = 'updated'
            it.opIndex = idx
            break
          }
        }
        break
      }
      case 'remove-item': {
        for (const cat of tree) {
          const it = cat.items.find((i) => i.rowKey === `item:${op.itemId}`)
          if (it) {
            it.state = 'removed'
            it.opIndex = idx
            break
          }
        }
        break
      }
    }
  })

  return tree
}
