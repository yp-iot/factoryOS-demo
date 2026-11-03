import { Crown, Moon, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppHeader, Card, STATUS_LABEL, Stat, StatusLight } from '../../components/ui'
import { clock, num, rm } from '../../lib/format'
import { useStore } from '../../sim/store'
import type { Machine, RunState } from '../../sim/types'

const BAR: Record<RunState, string> = { run: '#22c55e', idle: '#f59e0b', stop: '#ef4444' }

const sen = (rmPerPart: number) => `${(rmPerPart * 100).toFixed(2)} sen`

export function PowerCost() {
  const machines = useStore((s) => s.machines)
  const rate = useStore((s) => s.ratePerKWh)
  const setRate = useStore((s) => s.setRate)
  const selected = useStore((s) => s.powerMachine)
  const select = useStore((s) => s.setPowerMachine)

  const ranked = [...machines].sort((a, b) => b.kWh - a.kWh)
  const maxKW = Math.max(...machines.map((m) => m.runKW))
  const totalKWh = machines.reduce((a, m) => a + m.kWh, 0)
  const idleKWh = machines.reduce((a, m) => a + m.idleKWh, 0)
  const good = machines.reduce((a, m) => a + m.good, 0)

  return (
    <div>
      <AppHeader app="power-cost" />
      <div className="mb-4 grid grid-cols-3 gap-4 @5xl:grid-cols-5">
        <Card>
          <Stat label="Power cost today" value={rm(totalKWh * rate)} sub={`${num(totalKWh)} kWh since 07:00`} />
        </Card>
        <Card>
          <Stat label="Drawing now" value={`${num(machines.reduce((a, m) => a + m.kW, 0))} kW`} sub="All 7 machines" />
        </Card>
        <Card className={idleKWh * rate >= 5 ? 'border-idle/60' : ''}>
          <Stat label="Spent while idle" value={rm(idleKWh * rate)} tone="text-idle" sub="Powered on, making nothing" />
        </Card>
        <Card>
          <Stat label="Power per good part" value={sen((totalKWh * rate) / Math.max(1, good))} sub="Average, all machines" />
        </Card>
        <Card className="border-dashed">
          <div className="text-xs font-medium tracking-wide text-dim uppercase">Demo assumption</div>
          <label className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold">RM</span>
            <input
              type="number"
              step="0.01"
              min="0.05"
              value={rate}
              onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
              className="tabular w-20 rounded-lg border border-line bg-panel-2 px-2 py-1 text-xl font-bold"
            />
            <span className="text-dim">/ kWh</span>
          </label>
          <div className="mt-1 text-xs text-dim">Change to match your bill</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Card className="p-0">
          <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
            <h2 className="text-lg font-semibold">Most expensive first</h2>
            <span className="text-xs text-dim">Tap a machine for its 24 hours</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-dim uppercase">
              <tr className="border-y border-line text-left">
                <th className="py-2 pl-4 font-medium">#</th>
                <th className="font-medium">Machine</th>
                <th className="font-medium">Now</th>
                <th className="text-right font-medium">Today</th>
                <th className="text-right font-medium">Idle</th>
                <th className="pr-4 text-right font-medium">Per part</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m, i) => (
                <tr
                  key={m.id}
                  onClick={() => select(m.id)}
                  className={`cursor-pointer border-b border-line/50 last:border-0 hover:bg-panel-2 ${selected === m.id ? 'bg-accent/10' : ''}`}
                >
                  <td className="py-2.5 pl-4 text-dim">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2 font-bold">
                      <StatusLight status={m.status} size="sm" /> {m.id}
                      {i === 0 && <Crown size={14} className="text-accent" aria-label="Most expensive today" />}
                    </div>
                  </td>
                  <td className="w-32">
                    <div className="tabular text-xs">{num(m.kW, 1)} kW</div>
                    <div className="mt-0.5 h-1.5 rounded bg-panel-2">
                      <div className="h-full rounded" style={{ width: `${(m.kW / maxKW) * 100}%`, background: BAR[m.status] }} />
                    </div>
                  </td>
                  <td className="tabular text-right font-semibold">{rm(m.kWh * rate)}</td>
                  <td className={`tabular text-right ${m.idleKWh * rate >= 1 ? 'text-idle' : 'text-dim'}`}>{rm(m.idleKWh * rate)}</td>
                  <td className="tabular pr-4 text-right text-dim">{m.good > 0 ? sen((m.kWh * rate) / m.good) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm">
            <Crown size={16} className="text-accent" />
            <span>
              Most expensive today: <b>{ranked[0].id}</b> · {ranked[0].part} · {rm(ranked[0].kWh * rate)}
            </span>
          </div>
        </Card>

        <MachineDay m={machines.find((m) => m.id === selected)!} rate={rate} />
      </div>
    </div>
  )
}

function MachineDay({ m, rate }: { m: Machine; rate: number }) {
  const now = useStore((s) => s.simTime)
  const data = [...m.kwLog.slice(-95), { t: now, kW: m.kW, status: m.status }].map((d) => ({ ...d, label: clock(d.t) }))
  const idleRM = m.idleKWh * rate

  return (
    <Card>
      <div className="mb-3 flex items-center gap-3">
        <StatusLight status={m.status} size="lg" />
        <span className="text-2xl font-black">{m.id}</span>
        <span className="truncate text-dim">{m.part}</span>
        <span className="ml-auto text-sm text-dim">{STATUS_LABEL[m.status]}</span>
      </div>

      <div className={`mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 ${idleRM >= 1 ? 'bg-idle/15 text-idle' : 'bg-panel-2 text-dim'}`}>
        <Moon size={20} />
        <span className="text-lg font-bold">{rm(idleRM)} spent while idle today</span>
        <span className="ml-auto text-sm">{num(m.idleKWh, 1)} kWh</span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={1} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="#253049" />
            <XAxis dataKey="label" interval={15} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#253049' }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} unit=" kW" width={64} />
            <Tooltip
              cursor={{ fill: 'rgb(255 255 255 / 0.05)' }}
              contentStyle={{ background: '#111827', border: '1px solid #253049', borderRadius: 8 }}
              labelStyle={{ color: '#e8edf6' }}
              formatter={(v, _n, item) => [`${num(Number(v), 1)} kW · ${STATUS_LABEL[(item.payload as { status: RunState }).status]}`, '']}
              separator=""
            />
            <Bar dataKey="kW" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.t} fill={BAR[d.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-dim">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-run" /> Running</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-idle" /> Idle but powered</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-stop" /> Stopped</span>
        <span className="ml-auto flex items-center gap-1"><Zap size={12} /> Last 24 hours, 15-minute readings</span>
      </div>
    </Card>
  )
}
