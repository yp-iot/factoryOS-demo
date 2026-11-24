import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, CheckCircle2, ClipboardCheck, ListTodo, Truck, Wallet, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppHeader, Card } from '../../components/ui'
import { clock, num, pct, rm, shown } from '../../lib/format'
import { useChartColors } from '../../lib/theme'
import { dailyUsage } from '../../sim/engine'
import { binStock, onHand, SKUS, skuOf, WH_OPERATORS } from '../../sim/stock'
import { useStore } from '../../sim/store'
import type { SkuId } from '../../sim/types'
import { warehouseTasks } from '../../sim/warehouse'
import { committed } from './whShared'

const HOUR = 3600000
const IN = new Set(['Receipt', 'Put-away'])
const OUT = new Set(['Issue', 'Dispatch', 'Write-off'])
const TAPE_PER_DAY = 6

export function WarehouseDashboard() {
  const s = useStore()
  const midnight = new Date(s.simTime).setHours(0, 0, 0, 0)
  const todays = s.wh.txns.filter((t) => t.t >= midnight)
  const tasks = warehouseTasks(s)
  const urgent = tasks.filter((t) => t.urgent).length

  const value = SKUS.reduce((a, k) => a + onHand(k.id, s.materials, s.wh) * k.unitCost, 0)
  const used = binStock(s.materials, s.wh).filter((b) => b.sku)
  const space = used.reduce((a, b) => a + b.qty / b.cap, 0) / used.length
  const week = s.wh.counts.filter((c) => c.doneAt !== null && c.doneAt > s.simTime - 7 * 24 * HOUR)
  const accuracy = week.filter((c) => c.counted === c.expected).length / Math.max(1, week.length)

  return (
    <div>
      <AppHeader app="wh-dashboard">
        <div className="text-right text-xs text-dim">
          Updated live
          <div className="text-sm font-semibold text-ink">{clock(s.simTime)}</div>
        </div>
      </AppHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 @3xl:grid-cols-3 @6xl:grid-cols-6">
        <Kpi icon={Wallet} label="Stock value" value={rm(value, 0)} sub="Raw, packaging and finished goods" />
        <Kpi icon={Boxes} label="Space used" value={pct(space)} sub={`${used.length} bays in use`} />
        <Kpi icon={ListTodo} label="Open tasks" value={tasks.length} tone={urgent ? 'text-idle' : ''} sub={urgent ? `${urgent} urgent` : 'Nothing urgent'} />
        <Kpi icon={ArrowDownToLine} label="In today" value={todays.filter((t) => IN.has(t.type)).length} sub="Receipts and put-aways" />
        <Kpi icon={ArrowUpFromLine} label="Out today" value={todays.filter((t) => OUT.has(t.type)).length} sub="Issues and dispatches" />
        <Kpi icon={ClipboardCheck} label="Count accuracy" value={pct(accuracy)} tone={accuracy >= 0.95 ? 'text-run' : 'text-idle'} sub={`${week.length} counts this week`} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Movements />
        <Attention tasks={tasks} />
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
        <Cover />
        <Outbound />
        <Team />
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, tone = '' }: { icon: LucideIcon; label: string; value: ReactNode; sub: string; tone?: string }) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-dim">
        <Icon size={14} className="text-accent" /> {label}
      </div>
      <div className={`tabular mt-1 truncate text-2xl font-bold @6xl:text-3xl ${tone}`}>{value}</div>
      <div className="truncate text-xs text-dim">{sub}</div>
    </Card>
  )
}

/** Movements in and out, hour by hour since the shift started. */
function Movements() {
  const txns = useStore((s) => s.wh.txns)
  const now = useStore((s) => s.simTime)
  const c = useChartColors()
  // Whole hours on the clock the viewer sees, from the hour the shift started in.
  const offset = shown(0)
  const start = Math.floor((new Date(now).setHours(7, 0, 0, 0) + offset) / HOUR) * HOUR - offset
  const hours = Array.from({ length: Math.max(1, Math.ceil((now - start) / HOUR)) }, (_, i) => start + i * HOUR)
  const data = hours.map((h) => {
    const inHour = txns.filter((t) => t.t >= h && t.t < h + HOUR)
    return { hour: clock(h), In: inHour.filter((t) => IN.has(t.type)).length, Out: inHour.filter((t) => OUT.has(t.type)).length }
  })
  return (
    <Card>
      <h2 className="mb-2 font-semibold">Movements per hour, today</h2>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke={c.grid} />
            <XAxis dataKey="hour" tick={{ fill: c.tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.grid }} />
            <YAxis allowDecimals={false} tick={{ fill: c.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: c.cursor }} contentStyle={c.tooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="In" stackId="m" fill={c.info} isAnimationActive={false} />
            <Bar dataKey="Out" stackId="m" fill={c.idle} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

/** What a manager should look at, worked out from the live state. */
function Attention({ tasks }: { tasks: ReturnType<typeof warehouseTasks> }) {
  const s = useStore()
  const items: { tone: 'stop' | 'idle' | 'info'; text: string }[] = []
  for (const k of SKUS) {
    const free = onHand(k.id, s.materials, s.wh) - committed(k.id, s)
    if (free < k.reorder) items.push({ tone: 'stop', text: `${k.name}: ${num(free)} ${k.unit} free, reorder level is ${num(k.reorder)}` })
  }
  for (const t of tasks.filter((x) => x.kind === 'Dispatch' && x.urgent)) items.push({ tone: 'idle', text: `${t.ref} not loaded yet · ${t.why}` })
  for (const t of tasks.filter((x) => x.kind === 'Pick')) items.push({ tone: 'idle', text: `${t.ref}: ${num(t.qty)} ${t.unit} to pick for ${t.to}` })
  const pallets = tasks.filter((x) => x.id.startsWith('pal-'))
  if (pallets.length) items.push({ tone: 'info', text: `${pallets.length} pallet${pallets.length > 1 ? 's' : ''} waiting at pack-out (${pallets.map((p) => p.from.split(' ')[0]).join(', ')})` })
  const counts = tasks.filter((x) => x.kind === 'Count')
  if (counts.length) items.push({ tone: 'info', text: `${counts.length} cycle count${counts.length > 1 ? 's' : ''} due: ${counts.map((c) => c.from).join(', ')}` })

  const colour = { stop: 'text-stop', idle: 'text-idle', info: 'text-info' }
  return (
    <Card>
      <h2 className="mb-2 font-semibold">Needs attention</h2>
      {items.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-run">
          <CheckCircle2 size={16} /> All clear
        </div>
      )}
      <ul className="text-sm">
        {items.slice(0, 7).map((it) => (
          <li key={it.text} className="slide-in flex items-start gap-2 border-t border-line/50 py-2 first:border-t-0">
            <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${colour[it.tone]}`} />
            {it.text}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** How long raw material and packaging last at today's rate. */
function Cover() {
  const s = useStore()
  const use = dailyUsage(s.machines)
  const perDay = (id: SkuId) => (id === 'tape' ? TAPE_PER_DAY : (use[id] ?? 0))
  const rows = SKUS.filter((k) => k.category !== 'Finished goods')
  return (
    <Card className="p-0">
      <h2 className="px-4 pt-4 pb-2 font-semibold">Days of cover</h2>
      <table className="w-full text-sm">
        <thead className="text-xs text-dim uppercase">
          <tr className="border-b border-line text-left">
            <th className="py-2 pl-4 font-medium">Item</th>
            <th className="text-right font-medium">On hand</th>
            <th className="text-right font-medium">Per day</th>
            <th className="pr-4 text-right font-medium">Days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const days = onHand(k.id, s.materials, s.wh) / Math.max(0.001, perDay(k.id))
            return (
              <tr key={k.id} className="border-b border-line/50 last:border-0">
                <td className="py-2.5 pl-4 font-medium">{k.name}</td>
                <td className="tabular text-right">
                  {num(onHand(k.id, s.materials, s.wh))} <span className="text-xs text-dim">{k.unit}</span>
                </td>
                <td className="tabular text-right text-dim">{num(perDay(k.id))}</td>
                <td className={`tabular pr-4 text-right font-bold ${days < 2 ? 'text-stop' : days < 4 ? 'text-idle' : 'text-run'}`}>{days > 99 ? '99+' : days.toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function Outbound() {
  const orders = useStore((s) => s.wh.orders)
  const now = useStore((s) => s.simTime)
  const tomorrow = new Date(now).setHours(24, 0, 0, 0)
  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Truck size={16} className="text-accent" /> Going out
      </h2>
      <ul className="text-sm">
        {[...orders]
          .sort((a, b) => a.due - b.due)
          .map((o) => {
            const ctn = o.lines.reduce((a, l) => a + l.qty, 0)
            const late = o.dispatchedAt === null && o.due < now
            return (
              <li key={o.id} className="flex items-center gap-3 border-t border-line/50 py-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {o.id} <span className="font-normal text-dim">· {ctn} ctn</span>
                  </div>
                  <div className="truncate text-xs text-dim">{o.customer}</div>
                </div>
                {o.dispatchedAt ? (
                  <span className="rounded bg-run/15 px-2 py-0.5 text-xs font-semibold text-run">Loaded {clock(o.dispatchedAt)}</span>
                ) : (
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${late ? 'bg-stop/15 text-stop' : 'bg-panel-2 text-dim'}`}>
                    {late ? 'Late · ' : o.due >= tomorrow ? 'Tomorrow ' : 'Due '}
                    {clock(o.due)}
                  </span>
                )}
              </li>
            )
          })}
      </ul>
    </Card>
  )
}

/** Each operator's work today, from the transactions they scanned. */
function Team() {
  const s = useStore()
  const midnight = new Date(s.simTime).setHours(0, 0, 0, 0)
  const opTask = s.appState['op-task'] as string | undefined
  const opUser = (s.appState['op-user'] as string | undefined) ?? WH_OPERATORS[0]
  const active = opTask ? warehouseTasks(s).find((t) => t.id === opTask) : undefined
  return (
    <Card className="@3xl:col-span-2 @6xl:col-span-1">
      <h2 className="mb-2 font-semibold">Team today</h2>
      <ul className="text-sm">
        {WH_OPERATORS.map((name) => {
          const mine = s.wh.txns.filter((t) => t.by === name && t.t >= midnight)
          const last = mine[0]
          const busy = active && name === opUser
          return (
            <li key={name} className="flex items-center gap-3 border-t border-line/50 py-2 first:border-t-0">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${busy ? 'bg-accent text-black' : 'bg-panel-2'}`}>{name[0]}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{name}</div>
                <div className="truncate text-xs text-dim">{busy ? `Now: ${active.title}` : last ? `Last: ${last.type} ${skuOf(last.sku).name} at ${clock(last.t)}` : 'No scans yet'}</div>
              </div>
              <div className="text-right">
                <div className="tabular text-xl font-bold">{mine.length}</div>
                <div className="text-[11px] text-dim">scans</div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
