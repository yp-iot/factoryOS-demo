// Warehouse catalogue, rack layout, opening stock and the stock arithmetic.
// Pure: nothing here reads the store, so store.ts and the screens can both use it.
//
// Raw material and carton quantities live in store `materials`, because the engine
// uses them up as machines run. The racks show that same number spread over the
// item's bays, so the map can never disagree with Material Control.
import { PART_NAMES, PRICE } from './seed'
import type { Bin, CycleCount, Machine, MachineId, Material, OutOrder, Sku, SkuId, Txn, Warehouse } from './types'

export const MACHINE_IDS: MachineId[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'P1']
export const WH_OPERATORS = ['Zul', 'Kavitha', 'Faizal']

/** How each machine's parts are packed: parts per carton, cartons per pallet. */
export const PACK: Record<MachineId, { perCarton: number; perPallet: number }> = {
  M1: { perCarton: 1000, perPallet: 10 },
  M2: { perCarton: 100, perPallet: 20 },
  M3: { perCarton: 20, perPallet: 20 },
  M4: { perCarton: 12, perPallet: 20 },
  M5: { perCarton: 200, perPallet: 10 },
  M6: { perCarton: 4, perPallet: 15 },
  P1: { perCarton: 100, perPallet: 10 },
}

export const SKUS: Sku[] = [
  { id: 'pp', code: 'RM-PP-001', name: 'PP resin', category: 'Raw material', unit: 'kg', unitCost: 6.2, reorder: 2000 },
  { id: 'abs', code: 'RM-ABS-002', name: 'ABS resin', category: 'Raw material', unit: 'kg', unitCost: 9.8, reorder: 1000 },
  { id: 'mb', code: 'RM-MB-010', name: 'White masterbatch', category: 'Raw material', unit: 'kg', unitCost: 18, reorder: 100 },
  { id: 'carton', code: 'PK-CTN-450', name: 'Carton 450 × 350 × 300', category: 'Packaging', unit: 'pcs', unitCost: 2.1, reorder: 800 },
  { id: 'tape', code: 'PK-TAPE-48', name: 'Carton tape 48 mm', category: 'Packaging', unit: 'roll', unitCost: 4.5, reorder: 20 },
  ...MACHINE_IDS.map(
    (m): Sku => ({
      id: `fg-${m}`,
      code: `FG-${m}-${String(PACK[m].perCarton).padStart(4, '0')}`,
      name: `${PART_NAMES[m]} (${PACK[m].perCarton} pcs)`,
      category: 'Finished goods',
      unit: 'ctn',
      unitCost: Math.round(PRICE[m] * PACK[m].perCarton * 100) / 100,
      reorder: 10,
    }),
  ),
]

export const skuOf = (id: SkuId) => SKUS.find((s) => s.id === id)!
export const fgMachine = (id: SkuId) => (id.startsWith('fg-') ? (id.slice(3) as MachineId) : null)

const bays = (rack: string, from: number, to: number, sku: SkuId | null, cap: number): Bin[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ id: `${rack}${from + i}`, rack, bay: from + i, sku, cap }))

/** Racks A–F, top-down. An item fills its bays in order, so the last one is the part-used bay. */
export const BINS: Bin[] = [
  ...bays('A', 1, 6, 'abs', 800),
  ...bays('B', 1, 6, 'pp', 600),
  ...bays('C', 1, 2, 'mb', 120),
  ...bays('C', 3, 4, null, 120),
  ...bays('D', 1, 3, 'carton', 600),
  ...bays('D', 4, 4, 'tape', 60),
  ...bays('E', 1, 2, 'fg-M1', 40),
  ...bays('E', 3, 4, 'fg-M2', 60),
  ...bays('E', 5, 6, 'fg-M3', 60),
  ...bays('E', 7, 8, 'fg-M4', 60),
  ...bays('F', 1, 2, 'fg-M5', 40),
  ...bays('F', 3, 5, 'fg-M6', 30),
  ...bays('F', 6, 7, 'fg-P1', 40),
  ...bays('F', 8, 8, null, 40),
]

export const RACKS = ['A', 'B', 'C', 'D', 'E', 'F']
export const RACK_LABEL: Record<string, string> = {
  A: 'ABS resin',
  B: 'PP resin',
  C: 'Masterbatch',
  D: 'Packaging',
  E: 'Finished goods',
  F: 'Finished goods',
}

// ── Stock arithmetic ────────────────────────────────────────────────────

/** Quantity of an item in the racks (not counting what waits on a dock). */
export function rackQty(sku: SkuId, materials: Material[], wh: Warehouse) {
  const m = fgMachine(sku)
  if (m) return wh.fg[m]
  if (sku === 'tape') return wh.tape
  const staged = wh.staged.filter((x) => x.sku === sku).reduce((a, x) => a + x.qty, 0)
  return Math.max(0, materials.find((x) => x.id === sku)!.balance - staged)
}

/** Everything on hand: racks plus docks. */
export function onHand(sku: SkuId, materials: Material[], wh: Warehouse) {
  return rackQty(sku, materials, wh) + wh.staged.filter((x) => x.sku === sku).reduce((a, x) => a + x.qty, 0)
}

export interface BinStock extends Bin {
  qty: number
}

/** Every bay with what is in it now. */
export function binStock(materials: Material[], wh: Warehouse): BinStock[] {
  const left = new Map<SkuId, number>()
  return BINS.map((b) => {
    if (!b.sku) return { ...b, qty: 0 }
    if (!left.has(b.sku)) left.set(b.sku, rackQty(b.sku, materials, wh))
    const qty = Math.min(b.cap, left.get(b.sku)!)
    left.set(b.sku, left.get(b.sku)! - qty)
    return { ...b, qty: Math.round(qty) }
  })
}

/** Where to pick from: the part-used bay first, as a picker would. */
export function pickBin(sku: SkuId, materials: Material[], wh: Warehouse) {
  const mine = binStock(materials, wh).filter((b) => b.sku === sku && b.qty > 0)
  return (mine[mine.length - 1] ?? BINS.find((b) => b.sku === sku))?.id ?? '—'
}

/** Where to put away: the first bay with room, else the item's first bay. */
export function putBin(sku: SkuId, materials: Material[], wh: Warehouse) {
  const mine = binStock(materials, wh).filter((b) => b.sku === sku)
  return (mine.find((b) => b.qty < b.cap) ?? mine[0])?.id ?? '—'
}

/** The next transaction number, TX-00018 after TX-00017. */
export const nextTxnId = (txns: Txn[]) => `TX-${String(Math.max(0, ...txns.map((t) => Number(t.id.slice(3)))) + 1).padStart(5, '0')}`

/** Full pallets each machine has packed today, from its good-part count. */
export const palletsMade = (m: Machine) => Math.floor(m.good / PACK[m.id].perCarton / PACK[m.id].perPallet)

// ── Opening position ────────────────────────────────────────────────────

const at = (base: number, hh: number, mm: number, dayOffset = 0) => {
  const d = new Date(base + dayOffset * 86400000)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

export function seedWarehouse(now: number, machines: Machine[]): Warehouse {
  const made = Object.fromEntries(machines.map((m) => [m.id, palletsMade(m)])) as Record<MachineId, number>
  // M3 and M5 each have a pallet at pack-out waiting for a forklift.
  const fgPallets = Object.fromEntries(MACHINE_IDS.map((m) => [m, Math.max(0, made[m] - (m === 'M3' || m === 'M5' ? 1 : 0))])) as Record<MachineId, number>

  let n = 0
  const tx = (t: number, type: Txn['type'], sku: SkuId, qty: number, from: string, to: string, by: string, ref: string): Txn => ({
    id: `TX-${String(++n).padStart(5, '0')}`,
    t,
    type,
    sku,
    qty,
    from,
    to,
    by,
    ref,
  })
  const txns = [
    tx(at(now, 15, 10, -1), 'Receipt', 'abs', 1500, 'Contoh Polimer Sdn Bhd', 'Receiving dock', 'Faizal', 'GRN-0217'),
    tx(at(now, 15, 40, -1), 'Put-away', 'abs', 0, 'Receiving dock', 'A3', 'Zul', 'GRN-0217'),
    tx(at(now, 16, 40, -1), 'Dispatch', 'fg-M6', -12, 'F3', 'Dispatch dock', 'Faizal', 'DO-5519'),
    tx(at(now, 7, 15), 'Put-away', 'fg-M2', 20, 'M2 pack-out', 'E3', 'Zul', 'PAL-M2'),
    tx(at(now, 7, 32), 'Put-away', 'fg-M5', 10, 'M5 pack-out', 'F1', 'Kavitha', 'PAL-M5'),
    tx(at(now, 7, 45), 'Issue', 'pp', -160, 'B4', 'M2 line side', 'Zul', 'MR-0301'),
    tx(at(now, 7, 50), 'Issue', 'carton', -120, 'D3', 'Packing table', 'Kavitha', 'Packing'),
    tx(at(now, 8, 5), 'Dispatch', 'fg-M1', -10, 'E1', 'Dispatch dock', 'Faizal', 'DO-5521'),
    tx(at(now, 8, 5), 'Dispatch', 'fg-M4', -20, 'E7', 'Dispatch dock', 'Faizal', 'DO-5521'),
    tx(at(now, 8, 25), 'Receipt', 'carton', 1000, 'Contoh Kotak Sdn Bhd', 'Receiving dock', 'Faizal', 'GRN-0218'),
    tx(at(now, 8, 34), 'Put-away', 'fg-M1', 10, 'M1 pack-out', 'E1', 'Kavitha', 'PAL-M1'),
    tx(at(now, 8, 50), 'Put-away', 'carton', 0, 'Receiving dock', 'D1', 'Zul', 'GRN-0218'),
    tx(at(now, 8, 55), 'Put-away', 'fg-M4', 20, 'M4 pack-out', 'E8', 'Kavitha', 'PAL-M4'),
    tx(at(now, 9, 5), 'Adjust', 'mb', -2, 'C1', 'Count', 'Kavitha', 'CC-0107'),
    tx(at(now, 9, 15), 'Issue', 'mb', -6, 'C2', 'M4 line side', 'Zul', 'Line top-up'),
    tx(at(now, 9, 20), 'Put-away', 'fg-P1', 10, 'P1 pack-out', 'F6', 'Kavitha', 'PAL-P1'),
    tx(at(now, 9, 25), 'Write-off', 'carton', -15, 'D3', 'Damaged', 'Kavitha', 'Wet cartons'),
  ].reverse()

  const orders: OutOrder[] = [
    { id: 'DO-5521', customer: 'Contoh Home Sdn Bhd', lines: [{ sku: 'fg-M1', qty: 10 }, { sku: 'fg-M4', qty: 20 }], due: at(now, 9, 0), dispatchedAt: at(now, 8, 5), by: 'Faizal' },
    { id: 'DO-5523', customer: 'Contoh Retail Sdn Bhd', lines: [{ sku: 'fg-M1', qty: 8 }, { sku: 'fg-M4', qty: 6 }], due: at(now, 11, 0), dispatchedAt: null, by: null },
    { id: 'DO-5524', customer: 'Contoh Elektrik Sdn Bhd', lines: [{ sku: 'fg-M5', qty: 12 }, { sku: 'fg-M3', qty: 4 }], due: at(now, 15, 30), dispatchedAt: null, by: null },
    { id: 'DO-5525', customer: 'Contoh Kedai Runcit', lines: [{ sku: 'fg-M2', qty: 10 }, { sku: 'fg-M6', qty: 5 }], due: at(now, 10, 0, 1), dispatchedAt: null, by: null },
  ]

  // Two counts waiting for today (B3 is really one 25 kg bag short), this morning's
  // count that found C1 2 kg short, and a week of counts that matched.
  const matched = ['E3', 'D2', 'F1', 'B1', 'E7', 'A5', 'F6', 'A2']
  const counts: CycleCount[] = [
    { id: 'CC-0109', bin: 'F3', t: at(now, 9, 10), counted: null, expected: null, doneAt: null, by: null, actualDiff: 0 },
    { id: 'CC-0108', bin: 'B3', t: at(now, 9, 0), counted: null, expected: null, doneAt: null, by: null, actualDiff: -25 },
    { id: 'CC-0107', bin: 'C1', t: at(now, 8, 45), counted: 120, expected: 122, doneAt: at(now, 9, 5), by: 'Kavitha', actualDiff: 0 },
    ...matched.map((bin, i): CycleCount => {
      const day = -1 - Math.floor(i / 2)
      const cap = BINS.find((b) => b.id === bin)!.cap
      return { id: `CC-0${106 - i}`, bin, t: at(now, 9, 0, day), counted: cap, expected: cap, doneAt: at(now, 11 + (i % 2) * 3, 0, day), by: WH_OPERATORS[i % 3], actualDiff: 0 }
    }),
  ]

  return {
    fg: { M1: 52, M2: 70, M3: 64, M4: 88, M5: 38, M6: 41, P1: 22 },
    fgPallets,
    tape: 36,
    staged: [],
    orders,
    counts,
    txns,
  }
}
