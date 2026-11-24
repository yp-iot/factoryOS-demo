import { ArrowRight, ClipboardEdit, Search, X } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card, Stat } from '../../components/ui'
import { clock, dateTime, num, rm } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { BINS, onHand, SKUS, skuOf, WH_OPERATORS } from '../../sim/stock'
import { useStore } from '../../sim/store'
import type { Sku, SkuId, TxnType } from '../../sim/types'
import { recordMovement } from '../../sim/warehouse'
import { TxnChip } from './TxnChip'
import { baysOf, committed, qtyText } from './whShared'

const CATEGORIES = ['All', 'Raw material', 'Packaging', 'Finished goods'] as const
const TYPES: (TxnType | 'All')[] = ['All', 'Receipt', 'Put-away', 'Issue', 'Dispatch', 'Adjust', 'Write-off']

export function Inventory() {
  const s = useStore()
  const [tab, setTab] = useAppState<'stock' | 'txns'>('inv-tab', () => 'stock')
  const [recording, setRecording] = useAppState('inv-recording', () => false)

  const midnight = new Date(s.simTime).setHours(0, 0, 0, 0)
  const value = SKUS.reduce((a, k) => a + onHand(k.id, s.materials, s.wh) * k.unitCost, 0)
  const low = SKUS.filter((k) => onHand(k.id, s.materials, s.wh) - committed(k.id, s) < k.reorder).length
  const today = s.wh.txns.filter((t) => t.t >= midnight).length

  return (
    <div>
      <AppHeader app="inventory">
        <Button onClick={() => setRecording(true)}>
          <ClipboardEdit size={16} /> Record movement
        </Button>
      </AppHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
        <Card>
          <Stat label="Items" value={SKUS.length} sub={`${BINS.length} rack bays`} />
        </Card>
        <Card>
          <Stat label="Stock value" value={rm(value, 0)} sub="At cost" />
        </Card>
        <Card>
          <Stat label="Below reorder" value={low} tone={low ? 'text-stop' : 'text-run'} sub="After open picks and orders" />
        </Card>
        <Card>
          <Stat label="Movements today" value={today} sub="Every scan is one line" />
        </Card>
      </div>

      {recording && <RecordMovement onClose={() => setRecording(false)} />}

      <div className="mb-3 flex gap-1 rounded-lg border border-line bg-panel p-1 sm:w-fit">
        {(
          [
            ['stock', 'Stock on hand'],
            ['txns', 'Transactions'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-semibold sm:flex-none ${tab === id ? 'bg-accent text-black' : 'text-dim hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stock' ? <StockTable /> : <Transactions />}
    </div>
  )
}

function StockTable() {
  const s = useStore()
  const [cat, setCat] = useAppState<(typeof CATEGORIES)[number]>('inv-cat', () => 'All')
  const [q, setQ] = useState('')
  const rows = SKUS.filter((k) => cat === 'All' || k.category === cat).filter((k) => `${k.code} ${k.name}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${cat === c ? 'border-accent bg-accent/15 text-accent' : 'border-line text-dim hover:text-ink'}`}
          >
            {c}
          </button>
        ))}
        <label className="ml-auto flex min-w-48 items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm">
          <Search size={14} className="text-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or name" className="w-full bg-transparent outline-none" />
        </label>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-dim uppercase">
          <tr className="border-b border-line text-left">
            <th className="py-2.5 pl-4 font-medium">Item</th>
            <th className="font-medium">Where</th>
            <th className="text-right font-medium">On hand</th>
            <th className="text-right font-medium">Committed</th>
            <th className="text-right font-medium">Available</th>
            <th className="text-right font-medium">Reorder at</th>
            <th className="text-right font-medium">Value</th>
            <th className="pr-4 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const have = onHand(k.id, s.materials, s.wh)
            const held = committed(k.id, s)
            const free = have - held
            const docked = s.wh.staged.some((x) => x.sku === k.id)
            return (
              <tr key={k.id} className="border-b border-line/50">
                <td className="py-2.5 pl-4">
                  <div className="font-semibold">{k.name}</div>
                  <div className="text-xs text-dim">
                    {k.code} · {k.category}
                  </div>
                </td>
                <td className="text-dim">
                  {baysOf(k.id, s)}
                  {docked && <span className="ml-1 rounded bg-info/15 px-1.5 py-0.5 text-[11px] font-semibold text-info">+ on dock</span>}
                </td>
                <td className="tabular text-right font-semibold">
                  {num(have)} <span className="text-xs font-normal text-dim">{k.unit}</span>
                </td>
                <td className="tabular text-right text-dim">{held ? num(held) : '—'}</td>
                <td className="tabular text-right font-semibold">{num(free)}</td>
                <td className="tabular text-right text-dim">{num(k.reorder)}</td>
                <td className="tabular text-right">{rm(have * k.unitCost, 0)}</td>
                <td className="pr-4 text-right">
                  <StockStatus sku={k} free={free} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function StockStatus({ sku, free }: { sku: Sku; free: number }) {
  const [label, style] =
    free < sku.reorder ? ['Reorder', 'bg-stop/15 text-stop'] : free < sku.reorder * 1.25 ? ['Low', 'bg-idle/15 text-idle'] : ['OK', 'bg-run/15 text-run']
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${style}`}>{label}</span>
}

function Transactions() {
  const txns = useStore((s) => s.wh.txns)
  const now = useStore((s) => s.simTime)
  const [type, setType] = useAppState<TxnType | 'All'>('inv-type', () => 'All')
  const midnight = new Date(now).setHours(0, 0, 0, 0)
  const rows = txns.filter((t) => type === 'All' || t.type === type).slice(0, 80)

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${type === t ? 'border-accent bg-accent/15 text-accent' : 'border-line text-dim hover:text-ink'}`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs text-dim">{txns.length} lines · newest first</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-dim uppercase">
          <tr className="border-b border-line text-left">
            <th className="py-2.5 pl-4 font-medium">When</th>
            <th className="font-medium">Type</th>
            <th className="font-medium">Item</th>
            <th className="text-right font-medium">Qty</th>
            <th className="pl-6 font-medium">From → to</th>
            <th className="font-medium">By</th>
            <th className="pr-4 font-medium">Ref</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="slide-in border-b border-line/50">
              <td className="tabular py-2.5 pl-4 text-dim">{t.t >= midnight ? clock(t.t) : dateTime(t.t)}</td>
              <td>
                <TxnChip type={t.type} />
              </td>
              <td>
                <div className="font-medium">{skuOf(t.sku).name}</div>
                <div className="text-xs text-dim">{skuOf(t.sku).code}</div>
              </td>
              <td className={`tabular text-right font-semibold ${t.qty > 0 ? 'text-run' : t.qty < 0 ? 'text-stop' : 'text-dim'}`}>{qtyText(t.sku, t.qty)}</td>
              <td className="pl-6 text-dim">
                <span className="inline-flex items-center gap-1.5">
                  {t.from} <ArrowRight size={12} /> {t.to}
                </span>
              </td>
              <td>{t.by}</td>
              <td className="pr-4 text-dim">{t.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function RecordMovement({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<'Adjust' | 'Write-off'>('Write-off')
  const [sku, setSku] = useState<SkuId>('carton')
  const bays = BINS.filter((b) => b.sku === sku)
  const [bin, setBin] = useState(bays[0].id)
  const [qty, setQty] = useState(10)
  const [reason, setReason] = useState('')
  const [by, setBy] = useState(WH_OPERATORS[1])
  const unit = skuOf(sku).unit
  const field = 'rounded-lg border border-line bg-panel-2 px-3 py-2'

  return (
    <Card className="slide-in mb-4 border-accent/50">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Record a movement</h2>
        <button onClick={onClose} className="text-dim hover:text-ink" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 items-end gap-3 text-sm @4xl:grid-cols-[9rem_minmax(0,1fr)_6rem_7rem_minmax(0,1fr)_8rem_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-dim">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={field}>
            <option value="Write-off">Damaged</option>
            <option value="Adjust">Correction</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">Item</span>
          <select
            value={sku}
            onChange={(e) => {
              const next = e.target.value as SkuId
              setSku(next)
              setBin(BINS.find((b) => b.sku === next)!.id)
            }}
            className={field}
          >
            {SKUS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">Bay</span>
          <select value={bin} onChange={(e) => setBin(e.target.value)} className={field}>
            {bays.map((b) => (
              <option key={b.id}>{b.id}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">Qty ({unit})</span>
          <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} className={`tabular ${field}`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">Reason</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'Write-off' ? 'e.g. Forklift damage' : 'e.g. Found in wrong bay'} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">By</span>
          <select value={by} onChange={(e) => setBy(e.target.value)} className={field}>
            {WH_OPERATORS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <Button
          disabled={!qty}
          onClick={() => {
            recordMovement(type, sku, qty, bin, reason.trim(), by)
            onClose()
          }}
        >
          Save
        </Button>
      </div>
      <p className="mt-2 text-xs text-dim">
        {type === 'Write-off' ? 'Takes the quantity out of stock.' : 'A correction can be plus or minus.'} It is logged with who did it and why.
      </p>
    </Card>
  )
}
