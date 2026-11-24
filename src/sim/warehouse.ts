// Warehouse actions and the operator task queue. The catalogue, racks and stock
// arithmetic are in stock.ts; this file changes them and logs every movement.
import { PACK, binStock, fgMachine, nextTxnId, palletsMade, pickBin, putBin, skuOf } from './stock'
import { useStore, type Store } from './store'
import type { Grn, MachineId, SkuId, Txn, TxnType, Warehouse } from './types'

const get = useStore.getState
const set = useStore.setState

const nextNo = (rows: { id: string }[]) => Math.max(0, ...rows.map((r) => Number(r.id.split('-')[1]))) + 1

function log(wh: Warehouse, t: number, type: TxnType, sku: SkuId, qty: number, from: string, to: string, by: string, ref: string): Warehouse {
  const txn: Txn = { id: nextTxnId(wh.txns), t, type, sku, qty, from, to, by, ref }
  return { ...wh, txns: [txn, ...wh.txns] }
}

/** Change what the racks hold. Raw material and cartons live in store `materials`. */
function addStock(s: Store, sku: SkuId, qty: number): Pick<Store, 'wh' | 'materials'> {
  const m = fgMachine(sku)
  if (m) return { wh: { ...s.wh, fg: { ...s.wh.fg, [m]: Math.max(0, s.wh.fg[m] + qty) } }, materials: s.materials }
  if (sku === 'tape') return { wh: { ...s.wh, tape: Math.max(0, s.wh.tape + qty) }, materials: s.materials }
  return { wh: s.wh, materials: s.materials.map((x) => (x.id === sku ? { ...x, balance: Math.max(0, x.balance + qty) } : x)) }
}

/** A delivery has been received: its lines wait on the receiving dock for a put-away. */
export function stageReceipt(grn: Pick<Grn, 'id' | 'supplier' | 'lines'>, by = 'Stores') {
  const s = get()
  let wh = s.wh
  for (const line of grn.lines) {
    wh = { ...wh, staged: [...wh.staged, { id: `ST-${nextNo(wh.staged)}`, sku: line.material, qty: line.qty, ref: grn.id, t: s.simTime }] }
    wh = log(wh, s.simTime, 'Receipt', line.material, line.qty, grn.supplier, 'Receiving dock', by, grn.id)
  }
  set({ wh })
}

// ── Task queue ──────────────────────────────────────────────────────────

export type TaskKind = 'Pick' | 'Put away' | 'Dispatch' | 'Count'

export interface WhTask {
  id: string
  kind: TaskKind
  title: string
  sku: SkuId
  qty: number
  unit: string
  from: string
  to: string
  ref: string
  created: number
  urgent: boolean
  why: string
}

/** Everything an operator should do now, most urgent first. Worked out from the state, never stored. */
export function warehouseTasks(s: Store): WhTask[] {
  const out: WhTask[] = []
  const { materials, wh } = s

  for (const r of s.requests.filter((x) => x.issuedAt === null)) {
    const sku = skuOf(r.material)
    out.push({
      id: `pick-${r.id}`,
      kind: 'Pick',
      title: `Pick ${sku.name} for ${r.machineId}`,
      sku: r.material,
      qty: r.qty,
      unit: sku.unit,
      from: pickBin(r.material, materials, wh),
      to: `${r.machineId} line side`,
      ref: r.id,
      created: r.requestedAt,
      urgent: true,
      why: `${r.machineId} is waiting for it`,
    })
  }

  for (const o of wh.orders.filter((x) => x.dispatchedAt === null)) {
    const ctn = o.lines.reduce((a, l) => a + l.qty, 0)
    const left = o.due - s.simTime
    out.push({
      id: `do-${o.id}`,
      kind: 'Dispatch',
      title: `Pick and load ${o.id}`,
      sku: o.lines[0].sku,
      qty: ctn,
      unit: 'ctn',
      from: o.lines.map((l) => pickBin(l.sku, materials, wh)).join(', '),
      to: 'Dispatch dock',
      ref: o.id,
      created: o.due - 4 * 3600000,
      urgent: left < 2 * 3600000,
      why: `${o.customer} · lorry due ${left < 0 ? 'now' : `in ${Math.max(1, Math.round(left / 60000))} min`}`,
    })
  }

  for (const st of wh.staged) {
    const sku = skuOf(st.sku)
    out.push({
      id: `put-${st.id}`,
      kind: 'Put away',
      title: `Put away ${sku.name}`,
      sku: st.sku,
      qty: st.qty,
      unit: sku.unit,
      from: 'Receiving dock',
      to: putBin(st.sku, materials, wh),
      ref: st.ref,
      created: st.t,
      urgent: false,
      why: 'Delivery on the dock',
    })
  }

  for (const m of s.machines) {
    if (palletsMade(m) <= wh.fgPallets[m.id]) continue
    const sku = `fg-${m.id}` as SkuId
    out.push({
      id: `pal-${m.id}-${wh.fgPallets[m.id] + 1}`,
      kind: 'Put away',
      title: `Pallet from ${m.id} to the racks`,
      sku,
      qty: PACK[m.id].perPallet,
      unit: 'ctn',
      from: `${m.id} pack-out`,
      to: putBin(sku, materials, wh),
      ref: `PAL-${m.id}`,
      created: s.simTime,
      urgent: false,
      why: `Pack-out at ${m.id} is full`,
    })
  }

  for (const c of wh.counts.filter((x) => x.doneAt === null)) {
    const bin = binStock(materials, wh).find((b) => b.id === c.bin)!
    out.push({
      id: `cc-${c.id}`,
      kind: 'Count',
      title: `Count bay ${c.bin}`,
      sku: bin.sku ?? 'pp',
      qty: bin.qty,
      unit: bin.sku ? skuOf(bin.sku).unit : '',
      from: c.bin,
      to: c.bin,
      ref: c.id,
      created: c.t,
      urgent: false,
      why: 'Cycle count',
    })
  }

  return out.sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.created - b.created)
}

/** What the operator will find when counting: the system figure, plus how far the shelf really is off. */
export function countFinds(s: Store, countId: string) {
  const c = s.wh.counts.find((x) => x.id === countId)!
  const bin = binStock(s.materials, s.wh).find((b) => b.id === c.bin)!
  return Math.max(0, bin.qty + c.actualDiff)
}

/** The operator confirms a task. `counted` is only for counts. */
export function completeTask(task: WhTask, by: string, counted?: number) {
  const s = get()
  const t = s.simTime

  if (task.kind === 'Pick') {
    s.issueRequest(task.ref, by)
    return
  }

  if (task.kind === 'Dispatch') {
    const o = s.wh.orders.find((x) => x.id === task.ref)!
    let next: Store = s
    for (const line of o.lines) {
      const from = pickBin(line.sku, next.materials, next.wh)
      const moved = addStock(next, line.sku, -line.qty)
      next = { ...next, ...moved, wh: log(moved.wh, t, 'Dispatch', line.sku, -line.qty, from, 'Dispatch dock', by, o.id) }
    }
    set({ materials: next.materials, wh: { ...next.wh, orders: next.wh.orders.map((x) => (x.id === o.id ? { ...x, dispatchedAt: t, by } : x)) } })
    s.notify({ to: 'Owner', title: `${o.id} dispatched`, body: `${task.qty} cartons for ${o.customer}, loaded by ${by}.`, tone: 'ok' })
    return
  }

  if (task.kind === 'Put away' && task.id.startsWith('pal-')) {
    const m = task.from.split(' ')[0] as MachineId
    const moved = addStock(s, task.sku, task.qty)
    set({ wh: log({ ...moved.wh, fgPallets: { ...moved.wh.fgPallets, [m]: moved.wh.fgPallets[m] + 1 } }, t, 'Put-away', task.sku, task.qty, task.from, task.to, by, task.ref) })
    return
  }

  if (task.kind === 'Put away') {
    const stagedId = task.id.slice(4)
    set({ wh: log({ ...s.wh, staged: s.wh.staged.filter((x) => x.id !== stagedId) }, t, 'Put-away', task.sku, 0, 'Receiving dock', task.to, by, task.ref) })
    return
  }

  // Count: the difference corrects the stock and is logged as an adjustment.
  const c = s.wh.counts.find((x) => x.id === task.ref)!
  const expected = task.qty
  const found = counted ?? expected
  const diff = found - expected
  const moved = diff ? addStock(s, task.sku, diff) : { wh: s.wh, materials: s.materials }
  let wh: Warehouse = { ...moved.wh, counts: moved.wh.counts.map((x) => (x.id === c.id ? { ...x, counted: found, expected, doneAt: t, by } : x)) }
  if (diff) wh = log(wh, t, 'Adjust', task.sku, diff, c.bin, 'Count', by, c.id)
  set({ wh, materials: moved.materials })
}

/** A manager asks for a bay to be counted. */
export function requestCount(bin: string) {
  const s = get()
  if (s.wh.counts.some((c) => c.bin === bin && c.doneAt === null)) return
  const id = `CC-${String(nextNo(s.wh.counts)).padStart(4, '0')}`
  set({ wh: { ...s.wh, counts: [{ id, bin, t: s.simTime, counted: null, expected: null, doneAt: null, by: null, actualDiff: 0 }, ...s.wh.counts] } })
}

/** A stock correction or damaged goods, recorded by hand. */
export function recordMovement(type: 'Adjust' | 'Write-off', sku: SkuId, qty: number, bin: string, reason: string, by: string) {
  const s = get()
  const signed = type === 'Write-off' ? -Math.abs(qty) : qty
  const moved = addStock(s, sku, signed)
  set({ materials: moved.materials, wh: log(moved.wh, s.simTime, type, sku, signed, bin, type === 'Write-off' ? 'Damaged' : 'Correction', by, reason || '—') })
}
