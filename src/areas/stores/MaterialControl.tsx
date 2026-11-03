import { ArrowRight, Check, FileText, PackageCheck, Send, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, date, num } from '../../lib/format'
import { dailyUsage } from '../../sim/engine'
import { statusOf, suggestMaterial } from '../../sim/orders'
import { useChartColors } from '../../lib/theme'
import { useStore } from '../../sim/store'
import type { Material } from '../../sim/types'

const DAY = 86400000

export function MaterialControl() {
  return (
    <div>
      <AppHeader app="material-control" />
      <div className="flex flex-col gap-4">
        <Prediction />
        <StockCards />
        <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
          <NewRequest />
          <Requests />
        </div>
      </div>
    </div>
  )
}

function useDaysLeft() {
  const machines = useStore((s) => s.machines)
  const materials = useStore((s) => s.materials)
  const usage = dailyUsage(machines)
  return materials.map((m) => ({ m, perDay: usage[m.id], days: usage[m.id] > 0 ? (m.balance + m.lineSide) / usage[m.id] : Infinity }))
}

/** The low-stock forecast: which material runs out first, and when. */
function Prediction() {
  const now = useStore((s) => s.simTime)
  const notify = useStore((s) => s.notify)
  const [drafted, setDrafted] = useState(false)
  const c = useChartColors()
  const first = useDaysLeft().sort((a, b) => a.days - b.days)[0]
  const { m, perDay, days } = first
  const orderBy = now + Math.max(0, (m.balance + m.lineSide - m.reorderLevel) / perDay) * DAY
  const orderQty = Math.ceil((perDay * 5) / 500) * 500
  const forecast = Array.from({ length: 13 }, (_, i) => ({
    label: i % 2 === 0 ? `Day ${i / 2}` : '',
    kg: Math.max(0, m.balance + m.lineSide - perDay * (i / 2)),
  }))
  const urgent = days < 3

  return (
    <Card className={urgent ? 'border-idle/60 bg-idle/[0.05]' : ''}>
      <div className="flex flex-col gap-6 @4xl:flex-row">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles size={16} /> AI forecast
          </div>
          <div className="text-2xl font-bold">
            {m.name} runs out in ~{days < 1 ? 'less than a day' : `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`} at current usage
          </div>
          <div className="mt-1 text-dim">
            Using about {num(perDay)} {m.unit} a day on the machines running now.{' '}
            {orderBy - now < DAY ? (
              <>
                <b className="text-ink">Order today</b>: store stock {m.balance <= m.reorderLevel ? 'is already under' : 'drops under'} the reorder level of {num(m.reorderLevel)} {m.unit}.
              </>
            ) : (
              <>
                Order by <b className="text-ink">{date(orderBy)}</b> to stay above the reorder level of {num(m.reorderLevel)} {m.unit}.
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button
              disabled={drafted}
              onClick={() => {
                setDrafted(true)
                notify({ to: 'Owner', title: 'Purchase request drafted', body: `${num(orderQty)} ${m.unit} ${m.name}, about 5 days of use. Waiting for your approval.`, tone: 'info' }, { toast: true })
              }}
            >
              {drafted ? <Check size={16} /> : <FileText size={16} />}
              {drafted ? 'Sent to owner for approval' : `Draft purchase request: ${num(orderQty)} ${m.unit}`}
            </Button>
            <span className="text-xs text-dim">A person approves every order.</span>
          </div>
        </div>
        <div className="h-36 w-80 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <XAxis dataKey="label" interval={0} tick={{ fill: c.tick, fontSize: 10 }} tickLine={false} axisLine={{ stroke: c.grid }} />
              <YAxis tick={{ fill: c.tick, fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
              <ReferenceLine y={m.reorderLevel} stroke={c.idle} strokeDasharray="4 4" label={{ value: 'Reorder', fill: c.idle, fontSize: 10, position: 'insideTopRight' }} />
              <Line dataKey="kg" stroke={c.info} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}

function StockCards() {
  const rows = useDaysLeft()
  return (
    <div className="grid grid-cols-2 gap-4 @5xl:grid-cols-4">
      {rows.map(({ m, days }) => (
        <StockCard key={m.id} m={m} days={days} />
      ))}
    </div>
  )
}

function StockCard({ m, days }: { m: Material; days: number }) {
  const low = m.balance <= m.reorderLevel
  const full = m.reorderLevel * 2.5
  return (
    <Card className={low ? 'border-idle/60' : ''}>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{m.name}</span>
        <span className={`text-xs font-semibold ${days < 3 ? 'text-idle' : 'text-dim'}`}>{Number.isFinite(days) ? `${days.toFixed(1)} days` : 'not in use'}</span>
      </div>
      <div className={`tabular mt-1 text-3xl font-bold ${low ? 'text-idle' : ''}`}>
        {num(m.balance)} <span className="text-base font-medium text-dim">{m.unit}</span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-panel-2">
        <div className={`h-full rounded-full ${low ? 'bg-idle' : 'bg-info'}`} style={{ width: `${Math.min(100, (m.balance / full) * 100)}%` }} />
        <div className="absolute -top-1 h-4 w-0.5 bg-idle" style={{ left: `${(m.reorderLevel / full) * 100}%` }} title="Reorder level" />
      </div>
      <div className="mt-1.5 text-xs text-dim">
        In store · {num(m.lineSide)} {m.unit} issued to the floor
      </div>
    </Card>
  )
}

/** Production picks an order; the quantity is worked out for them. */
function NewRequest() {
  const orders = useStore((s) => s.workOrders)
  const machines = useStore((s) => s.machines)
  const requests = useStore((s) => s.requests)
  const request = useStore((s) => s.requestMaterial)
  const open = orders.filter((o) => {
    const st = statusOf(o)
    const m = machines.find((x) => x.id === o.machineId)!
    return (st === 'running' || st === 'released') && m.partWeightG > 0
  })
  const [woId, setWoId] = useState(open[0]?.id ?? '')
  const [thinking, setThinking] = useState(true)
  const [sent, setSent] = useState<string | null>(null)

  const pick = (id: string) => {
    setWoId(id)
    setThinking(true)
    setSent(null)
  }
  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 900)
    return () => clearTimeout(t)
  }, [woId])

  const wo = orders.find((o) => o.id === woId)
  const m = wo && machines.find((x) => x.id === wo.machineId)!
  const s = wo && m ? suggestMaterial(wo, m) : null
  const now = useStore((st) => st.simTime)
  // One request covers an order for a few hours; after that the order can ask again.
  const covered = requests.find((r) => r.woId === woId && now - r.requestedAt < 4 * 3600000)

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-black">1</span>
        <h2 className="text-lg font-semibold">Production asks for material</h2>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-dim">For work order</span>
        <select value={woId} onChange={(e) => pick(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
          {open.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id} · {o.machineId} · {o.part}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 min-h-28 rounded-lg border border-line bg-panel-2 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-accent">
          <Sparkles size={14} /> AI suggests
        </div>
        {thinking || !s || !m ? (
          <div className="animate-pulse text-dim">Reading the work order and the mould data…</div>
        ) : (
          <div className="slide-in">
            <div className="tabular text-3xl font-bold">
              {num(s.resinKg)} kg <span className="text-xl">{m.material.toUpperCase()} resin</span>
            </div>
            <div className="text-sm text-dim">+ {s.mbKg} kg masterbatch</div>
            <div className="mt-1 text-xs text-dim">{s.working}</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        {sent && <span className="text-sm text-run">Sent to stores as {sent}</span>}
        {covered && !sent && <span className="text-sm text-dim">{covered.id} already covers this order</span>}
        <Button disabled={thinking || !s || s.resinKg <= 0 || !!covered} onClick={() => setSent(request(woId))}>
          <Send size={16} /> Send request
        </Button>
      </div>
    </Card>
  )
}

function Requests() {
  const requests = useStore((s) => s.requests)
  const materials = useStore((s) => s.materials)
  const issue = useStore((s) => s.issueRequest)
  const name = (id: string) => materials.find((m) => m.id === id)!.name
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-black">2</span>
        <h2 className="text-lg font-semibold">Stores approves and issues</h2>
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {requests.map((r) => (
          <div key={r.id} className={`slide-in flex items-center gap-3 rounded-lg border px-3 py-2.5 ${r.issuedAt ? 'border-line' : 'border-accent/50 bg-accent/[0.06]'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <b>{r.id}</b>
                <span className="text-dim">
                  {r.woId} · {r.machineId}
                </span>
              </div>
              <div className="tabular font-semibold">
                {num(r.qty)} kg {name(r.material)}
              </div>
              <div className="text-xs text-dim">Asked {clock(r.requestedAt)}</div>
            </div>
            {r.issuedAt ? (
              <span className="flex items-center gap-1.5 text-sm text-run">
                <PackageCheck size={16} /> Issued {clock(r.issuedAt)}
              </span>
            ) : (
              <Button variant="ok" onClick={() => issue(r.id)}>
                Approve & issue <ArrowRight size={16} />
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-dim">Issuing takes the material out of store stock and onto the floor.</div>
    </Card>
  )
}
