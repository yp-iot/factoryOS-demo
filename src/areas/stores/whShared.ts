// Small pieces the four warehouse screens share.
import { num } from '../../lib/format'
import { binStock, skuOf } from '../../sim/stock'
import type { Store } from '../../sim/store'
import type { SkuId } from '../../sim/types'

/** "+1,000 kg", "−160 kg", or "moved" for a move inside the warehouse. */
export function qtyText(sku: SkuId, qty: number) {
  if (qty === 0) return 'moved'
  return `${qty > 0 ? '+' : '−'}${num(Math.abs(qty))} ${skuOf(sku).unit}`
}

/** The bays an item sits in, run together: "B1–B4", "C1, C2", "E1". */
export function baysOf(sku: SkuId, s: Pick<Store, 'materials' | 'wh'>) {
  const ids = binStock(s.materials, s.wh)
    .filter((b) => b.sku === sku && b.qty > 0)
    .map((b) => b.id)
  if (ids.length === 0) return '—'
  if (ids.length <= 2) return ids.join(', ')
  return `${ids[0]}–${ids[ids.length - 1]}`
}

/** Stock still promised to open requests and orders. */
export function committed(sku: SkuId, s: Pick<Store, 'requests' | 'wh'>) {
  const picks = s.requests.filter((r) => r.issuedAt === null && r.material === sku).reduce((a, r) => a + r.qty, 0)
  const orders = s.wh.orders
    .filter((o) => o.dispatchedAt === null)
    .flatMap((o) => o.lines)
    .filter((l) => l.sku === sku)
    .reduce((a, l) => a + l.qty, 0)
  return picks + orders
}
