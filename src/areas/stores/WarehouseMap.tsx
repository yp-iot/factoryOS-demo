import { ClipboardCheck, MousePointerClick } from 'lucide-react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, dateTime, num, pct, rm } from '../../lib/format'
import { useAppState, useSimNow } from '../../sim/hooks'
import { binStock, MACHINE_IDS, onHand, palletsMade, RACK_LABEL, RACKS, skuOf, WH_OPERATORS, type BinStock } from '../../sim/stock'
import { useStore } from '../../sim/store'
import { requestCount, warehouseTasks } from '../../sim/warehouse'
import { TxnChip } from './TxnChip'
import { committed, qtyText } from './whShared'

// Floor plan, top-down, in a 100 × 64 box. Raw material racks on the left,
// finished goods on the right, docks along the bottom wall.
const RAW = { x: 7, w: 5.6, gap: 0.7 }
const FG = { x: 54, w: 4.6, gap: 0.55 }
const ROW_Y: Record<string, number> = { A: 9, B: 17, C: 25, D: 33, E: 9, F: 17 }
const BAY_H = 4.4

function bayRect(b: { rack: string; bay: number }) {
  const g = b.rack === 'E' || b.rack === 'F' ? FG : RAW
  return { x: g.x + (b.bay - 1) * (g.w + g.gap), y: ROW_Y[b.rack], w: g.w, h: BAY_H }
}

const ZONES = {
  receiving: { x: 4, y: 45, w: 30, h: 13, label: 'Receiving dock' },
  office: { x: 38, y: 47, w: 18, h: 11, label: 'Stores office' },
  dispatch: { x: 60, y: 45, w: 35, h: 13, label: 'Dispatch dock' },
  qa: { x: 54, y: 27, w: 14, h: 11, label: 'QA hold' },
  packout: { x: 71, y: 27, w: 24, h: 11, label: 'Pallets from production' },
}

/** Where a task location sits on the plan. */
function pointOf(place: string, bins: BinStock[]) {
  const bin = bins.find((b) => b.id === place.split(',')[0].trim())
  if (bin) {
    const r = bayRect(bin)
    return { x: r.x + r.w / 2, y: r.y + r.h + 1.6 }
  }
  const z = place.includes('Receiving') ? ZONES.receiving : place.includes('Dispatch') ? ZONES.dispatch : place.includes('pack-out') ? ZONES.packout : null
  if (z) return { x: z.x + z.w / 2, y: z.y + z.h / 2 }
  return { x: 12, y: 4 } // line side: out through the top door to the moulding floor
}

// Where each operator waits between tasks.
const HOME = [
  { x: 24, y: 23.5 },
  { x: 74, y: 23.5 },
  { x: 48, y: 42 },
]

export function WarehouseMap() {
  const s = useStore()
  const now = useSimNow(500)
  const [mode, setMode] = useAppState<'fill' | 'activity'>('map-mode', () => 'fill')
  const [selected, setSelected] = useAppState<string | null>('map-bin', () => null)
  const opTask = s.appState['op-task'] as string | undefined
  const opUser = (s.appState['op-user'] as string | undefined) ?? WH_OPERATORS[0]
  const opStep = (s.appState['op-step'] as number | undefined) ?? 0

  const bins = binStock(s.materials, s.wh)
  const midnight = new Date(s.simTime).setHours(0, 0, 0, 0)
  const todays = s.wh.txns.filter((t) => t.t >= midnight)
  const activity = (id: string) => todays.filter((t) => t.from === id || t.to === id).length
  const maxActivity = Math.max(1, ...bins.map((b) => activity(b.id)))
  const counting = new Set(s.wh.counts.filter((c) => c.doneAt === null).map((c) => c.bin))
  const tasks = warehouseTasks(s)
  const active = tasks.find((t) => t.id === opTask)
  const ready = MACHINE_IDS.filter((m) => palletsMade(s.machines.find((x) => x.id === m)!) > s.wh.fgPallets[m])
  const openOrders = s.wh.orders.filter((o) => o.dispatchedAt === null)

  const lowSku = (sku: BinStock['sku']) => !!sku && onHand(sku, s.materials, s.wh) - committed(sku, s) < skuOf(sku).reorder

  return (
    <div>
      <AppHeader app="wh-map">
        <div className="flex gap-1 rounded-lg border border-line bg-panel p-1">
          {(
            [
              ['fill', 'How full'],
              ['activity', 'Busy today'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${mode === id ? 'bg-accent text-black' : 'text-dim hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
      </AppHeader>

      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="p-3">
          <svg viewBox="0 0 100 64" className="w-full select-none">
            <rect width="100" height="64" rx="1.2" className="fill-bg stroke-line" strokeWidth="0.3" />
            {/* Doors: to the moulding floor at the top, lorry bays at the bottom. */}
            <rect x="7" y="-0.2" width="10" height="1" className="fill-accent" />
            <text x="18" y="2.6" fontSize="1.6" className="fill-dim">
              To the moulding floor
            </text>
            {[8, 18, 66, 78].map((x) => (
              <rect key={x} x={x} y="63.2" width="8" height="1" className="fill-accent" />
            ))}

            {Object.values(ZONES).map((z) => (
              <g key={z.label}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="0.8" className="fill-panel stroke-line" strokeWidth="0.25" strokeDasharray="0.8 0.6" />
                <text x={z.x + 1} y={z.y + 2.4} fontSize="1.6" className="fill-dim">
                  {z.label}
                </text>
              </g>
            ))}

            {/* Pallets on the receiving dock, waiting for a put-away. */}
            {s.wh.staged.map((st, i) => (
              <g key={st.id}>
                <rect x={ZONES.receiving.x + 2 + i * 7} y={ZONES.receiving.y + 4} width="6" height="5" rx="0.5" className="fill-info/30 stroke-info" strokeWidth="0.3" />
                <text x={ZONES.receiving.x + 2.4 + i * 7} y={ZONES.receiving.y + 7} fontSize="1.4" className="fill-ink">
                  {skuOf(st.sku).name.split(' ')[0]}
                </text>
              </g>
            ))}
            {/* Pallets at pack-out, one per machine with a full one waiting. */}
            {ready.map((m, i) => (
              <g key={m}>
                <rect x={ZONES.packout.x + 1.5 + i * 5.5} y={ZONES.packout.y + 4} width="4.6" height="4.6" rx="0.5" className="fill-run/30 stroke-run" strokeWidth="0.3" />
                <text x={ZONES.packout.x + 2.3 + i * 5.5} y={ZONES.packout.y + 6.9} fontSize="1.5" fontWeight="700" className="fill-ink">
                  {m}
                </text>
              </g>
            ))}
            {/* Orders waiting to be loaded. */}
            {openOrders.slice(0, 3).map((o, i) => (
              <g key={o.id}>
                <rect x={ZONES.dispatch.x + 1.5 + i * 11} y={ZONES.dispatch.y + 4} width="10" height="6.5" rx="0.6" className="fill-accent/15 stroke-accent" strokeWidth="0.3" />
                <text x={ZONES.dispatch.x + 2.2 + i * 11} y={ZONES.dispatch.y + 6.6} fontSize="1.5" fontWeight="700" className="fill-ink">
                  {o.id}
                </text>
                <text x={ZONES.dispatch.x + 2.2 + i * 11} y={ZONES.dispatch.y + 9} fontSize="1.3" className="fill-dim">
                  due {clock(o.due)}
                </text>
              </g>
            ))}

            {RACKS.map((r) => {
              const first = bins.find((b) => b.rack === r)!
              const rr = bayRect(first)
              return (
                <text key={r} x={rr.x - 1} y={rr.y + 3} fontSize="2.2" fontWeight="800" textAnchor="end" className="fill-dim">
                  {r}
                </text>
              )
            })}
            <text x={RAW.x} y="7.4" fontSize="1.5" className="fill-dim">
              Raw material & packaging
            </text>
            <text x={FG.x} y="7.4" fontSize="1.5" className="fill-dim">
              Finished goods
            </text>

            {bins.map((b) => {
              const r = bayRect(b)
              const fill = b.cap ? b.qty / b.cap : 0
              const level = mode === 'fill' ? fill : activity(b.id) / maxActivity
              const tone = mode === 'activity' ? 'fill-info' : lowSku(b.sku) ? 'fill-idle' : 'fill-run'
              const isSel = selected === b.id
              return (
                <g key={b.id} onClick={() => setSelected(isSel ? null : b.id)} className="cursor-pointer">
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="0.4" className={`fill-panel-2 ${b.sku ? 'stroke-line' : 'stroke-line/60'}`} strokeWidth="0.25" strokeDasharray={b.sku ? undefined : '0.6 0.4'} />
                  {level > 0 && <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="0.4" className={tone} opacity={0.18 + 0.7 * level} />}
                  {counting.has(b.id) && <rect x={r.x - 0.4} y={r.y - 0.4} width={r.w + 0.8} height={r.h + 0.8} rx="0.6" fill="none" className="stroke-info" strokeWidth="0.35" strokeDasharray="0.8 0.5" />}
                  {isSel && <rect x={r.x - 0.5} y={r.y - 0.5} width={r.w + 1} height={r.h + 1} rx="0.7" fill="none" className="stroke-accent" strokeWidth="0.5" />}
                  <text x={r.x + r.w / 2} y={r.y + 2.9} fontSize="1.5" fontWeight="700" textAnchor="middle" className="pointer-events-none fill-ink">
                    {b.id}
                  </text>
                </g>
              )
            })}

            {WH_OPERATORS.map((name, i) => {
              const busy = active && name === opUser
              // The operator on the station walks to the pick bay, then to where it goes.
              const target = busy ? pointOf(opStep < 2 ? active.from : active.to, bins) : null
              const x = target ? target.x : HOME[i].x + Math.sin(now / 7000 + i * 2) * 3
              const y = target ? target.y : HOME[i].y + Math.cos(now / 9000 + i) * 0.8
              return (
                <g key={name} style={{ transition: 'transform 1.2s ease-in-out' }} transform={`translate(${x} ${y})`}>
                  {busy && (
                    <circle r="1.8" fill="none" className="stroke-accent" strokeWidth="0.3">
                      <animate attributeName="r" values="1.2;3;1.2" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r="1.1" className={busy ? 'fill-accent' : 'fill-info'} />
                  <text x="1.6" y="0.6" fontSize="1.5" fontWeight={busy ? 700 : 400} className="fill-ink">
                    {name}
                  </text>
                </g>
              )
            })}
          </svg>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-dim">
            {mode === 'fill' ? (
              <>
                <Legend className="bg-run" label="Stock, darker = fuller" />
                <Legend className="bg-idle" label="Item below reorder" />
              </>
            ) : (
              <Legend className="bg-info" label="Movements today, darker = busier" />
            )}
            <Legend className="border border-dashed border-info" label="Count due" />
            <Legend className="rounded-full bg-info" label="Operator" />
            <span className="ml-auto flex items-center gap-1">
              <MousePointerClick size={13} /> Tap a bay
            </span>
          </div>
        </Card>

        {selected ? <BayPanel id={selected} /> : <Summary bins={bins} />}
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${className}`} /> {label}
    </span>
  )
}

function Summary({ bins }: { bins: BinStock[] }) {
  const used = bins.filter((b) => b.sku)
  const space = used.reduce((a, b) => a + b.qty / b.cap, 0) / used.length
  const full = used.filter((b) => b.qty >= b.cap).length
  const empty = bins.filter((b) => b.qty === 0).length
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <div className="text-xs font-medium tracking-wide text-dim uppercase">Space used</div>
        <div className="tabular text-4xl font-bold">{pct(space)}</div>
        <div className="mt-2 h-2 rounded-full bg-panel-2">
          <div className="h-full rounded-full bg-run" style={{ width: `${space * 100}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Full', full],
          ['Part used', used.length - full - used.filter((b) => b.qty === 0).length],
          ['Empty', empty],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg bg-panel-2 p-2">
            <div className="tabular text-2xl font-bold">{n}</div>
            <div className="text-xs text-dim">{label}</div>
          </div>
        ))}
      </div>
      <div className="text-sm">
        <div className="mb-1 font-semibold">Racks</div>
        {RACKS.map((r) => {
          const mine = bins.filter((b) => b.rack === r && b.sku)
          const f = mine.reduce((a, b) => a + b.qty / b.cap, 0) / Math.max(1, mine.length)
          return (
            <div key={r} className="flex items-center gap-2 py-1">
              <span className="w-5 font-bold">{r}</span>
              <span className="w-28 truncate text-dim">{RACK_LABEL[r]}</span>
              <div className="h-1.5 flex-1 rounded-full bg-panel-2">
                <div className="h-full rounded-full bg-run" style={{ width: `${f * 100}%` }} />
              </div>
              <span className="tabular w-10 text-right text-xs">{pct(f)}</span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-dim">Tap any bay to see what is in it and what moved through it today.</p>
    </Card>
  )
}

function BayPanel({ id }: { id: string }) {
  const s = useStore()
  const [, setSelected] = useAppState<string | null>('map-bin', () => null)
  const bin = binStock(s.materials, s.wh).find((b) => b.id === id)!
  const sku = bin.sku ? skuOf(bin.sku) : null
  const moves = s.wh.txns.filter((t) => t.from === id || t.to === id).slice(0, 5)
  const openCount = s.wh.counts.find((c) => c.bin === id && c.doneAt === null)
  const lastCount = s.wh.counts.find((c) => c.bin === id && c.doneAt !== null)

  return (
    <Card className="slide-in flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-dim uppercase">
            Bay · rack {bin.rack}, {RACK_LABEL[bin.rack]}
          </div>
          <div className="text-4xl font-black">{bin.id}</div>
        </div>
        <button onClick={() => setSelected(null)} className="text-sm text-dim hover:text-ink">
          Close
        </button>
      </div>
      {sku ? (
        <>
          <div>
            <div className="font-semibold">{sku.name}</div>
            <div className="text-xs text-dim">{sku.code}</div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="tabular text-2xl font-bold">
                {num(bin.qty)} <span className="text-sm font-normal text-dim">{sku.unit}</span>
              </span>
              <span className="text-sm text-dim">of {num(bin.cap)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-run" style={{ width: `${(bin.qty / bin.cap) * 100}%` }} />
            </div>
            <div className="mt-1 text-xs text-dim">Worth {rm(bin.qty * sku.unitCost, 0)} at cost</div>
          </div>
        </>
      ) : (
        <div className="text-sm text-dim">Free bay. Nothing is assigned here.</div>
      )}
      <div className="text-sm">
        <div className="mb-1 font-semibold">Last movements</div>
        {moves.length === 0 && <div className="text-dim">None recorded.</div>}
        {moves.map((t) => (
          <div key={t.id} className="flex items-center gap-2 border-t border-line/50 py-1.5">
            <TxnChip type={t.type} />
            <span className="tabular text-xs text-dim">{clock(t.t)}</span>
            <span className="tabular ml-auto text-xs font-semibold">{qtyText(t.sku, t.qty)}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto text-xs text-dim">{lastCount ? `Last counted ${dateTime(lastCount.doneAt!)} by ${lastCount.by}` : 'Not counted this week'}</div>
      {sku && (
        <Button variant="ghost" disabled={!!openCount} onClick={() => requestCount(bin.id)}>
          <ClipboardCheck size={16} /> {openCount ? `Count ${openCount.id} sent to operators` : 'Ask for a count'}
        </Button>
      )}
    </Card>
  )
}
