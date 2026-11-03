import { AlertTriangle, CheckCircle2, TrendingDown, UserRound } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card, StatusLight } from '../../components/ui'
import { clock, dateTime, duration, minutes, pct } from '../../lib/format'
import { oee } from '../../sim/engine'
import { useSimNow } from '../../sim/hooks'
import { dayStart } from '../../sim/seed'
import { useStore } from '../../sim/store'
import type { Breakdown, MachineId } from '../../sim/types'

const REASONS = ['Mould temp — heater fault', 'Heater band replaced', 'Hydraulic leak', 'Material jam', 'Ejector pin stuck', 'Electrical', 'Mould damage', 'Other']

export function BreakdownReporting() {
  const breakdowns = useStore((s) => s.breakdowns)
  const open = breakdowns.filter((b) => b.end === null)
  const history = breakdowns.filter((b) => b.end !== null)
  const simTime = useStore((s) => s.simTime)
  const todayMin = history.filter((b) => b.start >= dayStart(simTime)).reduce((a, b) => a + minutes(b.end! - b.start), 0)

  return (
    <div>
      <AppHeader app="breakdown" />
      <div className="flex flex-col gap-4">
        {open.length === 0 ? <AllClear /> : open.map((b) => <OpenBreakdown key={b.id} b={b} />)}

        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">History</h2>
            <span className="text-sm text-dim">
              Downtime today: <b className="tabular text-ink">{todayMin} min</b>
            </span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-dim uppercase">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Report</th>
                <th className="font-medium">Machine</th>
                <th className="font-medium">Stopped</th>
                <th className="font-medium">Reason</th>
                <th className="font-medium">Technician</th>
                <th className="text-right font-medium">Downtime</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => (
                <tr key={b.id} className="slide-in border-b border-line/50 last:border-0">
                  <td className="py-2.5 text-dim">{b.id}</td>
                  <td className="font-semibold">{b.machineId}</td>
                  <td className="text-dim">{dateTime(b.start)}</td>
                  <td>{b.reason}</td>
                  <td>{b.technician}</td>
                  <td className="tabular text-right font-semibold">{minutes(b.end! - b.start)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

function OpenBreakdown({ b }: { b: Breakdown }) {
  const now = useSimNow()
  const machine = useStore((s) => s.machines.find((m) => m.id === b.machineId)!)
  const setReason = useStore((s) => s.setBreakdownReason)
  const resolve = useStore((s) => s.resolveBreakdown)
  const oeeNow = oee(machine).oee

  return (
    <Card className="border-stop/70 bg-stop/[0.06]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusLight status="stop" size="lg" />
        <span className="text-3xl font-black">{b.machineId}</span>
        <span className="text-dim">{machine.part}</span>
        <span className="ml-auto flex items-center gap-2 rounded-lg bg-stop/15 px-3 py-1.5 font-semibold text-stop">
          <AlertTriangle size={18} /> {b.alarm}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
        <div>
          <div className="text-xs font-medium tracking-wide text-dim uppercase">Stopped at</div>
          <div className="tabular text-3xl font-bold">{clock(b.start)}</div>
          <div className="text-sm text-dim">{b.id}</div>
        </div>
        <div>
          <div className="text-xs font-medium tracking-wide text-dim uppercase">Downtime</div>
          <div className="tabular text-4xl font-black text-stop">{duration((now - b.start) / 1000)}</div>
        </div>
        <div>
          <div className="text-xs font-medium tracking-wide text-dim uppercase">{b.machineId} OEE today</div>
          <div className="tabular flex items-center gap-2 text-3xl font-bold">
            {pct(oeeNow, 1)}
            {b.oeeAtStart !== undefined && oeeNow < b.oeeAtStart - 0.0005 && <TrendingDown className="text-stop" size={24} />}
          </div>
          {b.oeeAtStart !== undefined && <div className="text-sm text-dim">was {pct(b.oeeAtStart, 1)} when it stopped</div>}
        </div>
        <div>
          <div className="text-xs font-medium tracking-wide text-dim uppercase">Technician</div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <UserRound size={22} className="text-accent" /> {b.technician}
          </div>
          <div className="text-sm text-run">Alert sent to phone</div>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 text-sm font-semibold">What caused it?</div>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(b.id, r)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                b.reason === r ? 'border-accent bg-accent text-black font-semibold' : 'border-line bg-panel-2 hover:border-accent/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {!b.reason && <span className="text-sm text-dim">Pick a reason first</span>}
          <Button variant="ok" disabled={!b.reason} onClick={() => resolve(b.id)} className="px-6 py-2.5 text-base">
            <CheckCircle2 size={18} /> Resolved
          </Button>
        </div>
      </div>
    </Card>
  )
}

function AllClear() {
  const machines = useStore((s) => s.machines)
  const report = useStore((s) => s.reportBreakdown)
  const [machine, setMachine] = useState<MachineId>('M1')
  return (
    <Card className="flex flex-wrap items-center gap-4 border-run/40">
      <CheckCircle2 className="text-run" size={32} />
      <div className="min-w-[12rem] flex-1">
        <div className="text-lg font-semibold">No open breakdowns</div>
        <div className="text-sm text-dim">When a machine stops, its report opens here by itself.</div>
      </div>
      <select
        value={machine}
        onChange={(e) => setMachine(e.target.value as MachineId)}
        className="rounded-lg border border-line bg-panel-2 px-3 py-2"
      >
        {machines.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id} · {m.part}
          </option>
        ))}
      </select>
      <Button variant="danger" onClick={() => report(machine, 'Reported by operator')}>
        Report a breakdown
      </Button>
    </Card>
  )
}
