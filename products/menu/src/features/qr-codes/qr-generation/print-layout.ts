export const A4_W_MM = 210
export const A4_H_MM = 297

export const MIN_PAGE_MARGIN_MM = 3
export const MAX_PAGE_MARGIN_MM = 15
export const DEFAULT_PAGE_MARGIN_MM = 5

export const MIN_GUTTER_MM = 4
export const MAX_GUTTER_MM = 20
export const DEFAULT_GUTTER_MM = 6

export const MIN_QR_MM = 20
export const MAX_QR_MM = 80
export const DEFAULT_QR_MM = 35

export type PrintLayoutInputs = {
  qrSizeMm: number
  gutterMm: number
  pageMarginMm: number
}

export type PrintGrid = {
  cols: number
  rows: number
  total: number
  mmPerCode: number
}

export type AutoFitInputs = {
  minQrSizeMm: number
  gutterMm: number
  pageMarginMm: number
  stepMm?: number
}

export type AutoFitResult = PrintGrid & { qrSizeMm: number }

/** Clamp each field into its [min, max] band, substituting defaults for missing values. */
export function clampLayoutInputs(raw: Partial<PrintLayoutInputs>): PrintLayoutInputs {
  return {
    qrSizeMm: clamp(raw.qrSizeMm ?? DEFAULT_QR_MM, MIN_QR_MM, MAX_QR_MM),
    gutterMm: clamp(raw.gutterMm ?? DEFAULT_GUTTER_MM, MIN_GUTTER_MM, MAX_GUTTER_MM),
    pageMarginMm: clamp(
      raw.pageMarginMm ?? DEFAULT_PAGE_MARGIN_MM,
      MIN_PAGE_MARGIN_MM,
      MAX_PAGE_MARGIN_MM,
    ),
  }
}

/**
 * Pack a uniform grid of square QR cells inside an A4 page under
 * `2·pageMargin + cols·qr + (cols−1)·gutter ≤ A4_W` (symmetric for height).
 * `pageMargin` is the printer-safe outer band; `gutter` is the scissor
 * lane between cells and doubles as the QR quiet zone.
 */
export function computeGrid({
  qrSizeMm,
  gutterMm,
  pageMarginMm,
}: PrintLayoutInputs): PrintGrid {
  const printableW = A4_W_MM - 2 * pageMarginMm
  const printableH = A4_H_MM - 2 * pageMarginMm
  const denom = qrSizeMm + gutterMm
  if (denom <= 0 || printableW < qrSizeMm || printableH < qrSizeMm) {
    return { cols: 0, rows: 0, total: 0, mmPerCode: 0 }
  }
  const cols = Math.max(0, Math.floor((printableW + gutterMm) / denom))
  const rows = Math.max(0, Math.floor((printableH + gutterMm) / denom))
  const total = cols * rows
  const mmPerCode = total > 0 ? (A4_W_MM * A4_H_MM) / total : 0
  return { cols, rows, total, mmPerCode }
}

/**
 * Sweep QR size from `MAX_QR_MM` down to `minQrSizeMm` and return the
 * size that maximises codes per sheet, breaking ties in favour of the
 * largest QR (same paper cost, easier scan).
 */
export function autoFitQrSize(inputs: AutoFitInputs): AutoFitResult {
  const step = inputs.stepMm ?? 0.5
  const lo = clamp(inputs.minQrSizeMm, MIN_QR_MM, MAX_QR_MM)
  const gutterMm = clamp(inputs.gutterMm, MIN_GUTTER_MM, MAX_GUTTER_MM)
  const pageMarginMm = clamp(
    inputs.pageMarginMm,
    MIN_PAGE_MARGIN_MM,
    MAX_PAGE_MARGIN_MM,
  )

  let best: AutoFitResult = { qrSizeMm: lo, cols: 0, rows: 0, total: -1, mmPerCode: 0 }
  for (let s = MAX_QR_MM; s >= lo; s -= step) {
    const g = computeGrid({ qrSizeMm: s, gutterMm, pageMarginMm })
    if (g.total > best.total) best = { qrSizeMm: round1(s), ...g }
  }
  if (best.total < 0) {
    best = { qrSizeMm: lo, ...computeGrid({ qrSizeMm: lo, gutterMm, pageMarginMm }) }
  }
  return best
}

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min
  return Math.max(min, Math.min(max, v))
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}
