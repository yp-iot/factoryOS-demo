import { Gauge, Play, Power, Thermometer, Timer, Zap } from 'lucide-react'
import { AppHeader, Card, STATUS_COLOR, STATUS_LABEL, STATUS_TEXT, StatusLight } from '../../components/ui'
import { num } from '../../lib/format'
import { useStore } from '../../sim/store'
import type { Machine } from '../../sim/types'

const HOUR = 3600000

export function MachineStatus() {
  const machines = useStore((s) => s.machines)
  const counts = { run: 0, stop: 0, idle: 0 }
  machines.forEach((m) => counts[m.status]++)
  return (
    <div>
      <AppHeader app="machine-status">
        <div className="flex gap-4 text-sm">
          {(['run', 'idle', 'stop'] as const).map((st) => (
            <span key={st} className="flex items-center gap-1.5">
              <StatusLight status={st} size="sm" /> <b className="tabular text-lg">{counts[st]}</b> {STATUS_LABEL[st]}
            </span>
          ))}
        </div>
      </AppHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
        {machines.map((m) => (
          <MachineCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  )
}

function Reading({ icon: Icon, label, value, warn }: { icon: typeof Zap; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-panel-2 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-dim">
        <Icon size={13} /> {label}
      </div>
      <div className={`tabular text-xl font-bold ${warn ? 'text-stop' : ''}`}>{value}</div>
    </div>
  )
}

function MachineCard({ m }: { m: Machine }) {
  const report = useStore((s) => s.reportBreakdown)
  const setStatus = useStore((s) => s.setStatus)
  return (
    <Card className={m.status === 'stop' ? 'border-stop/70' : ''}>
      <div className="mb-3 flex items-center gap-2.5">
        <StatusLight status={m.status} size="lg" />
        <span className="text-2xl font-black">{m.id}</span>
        <span className={`ml-auto text-sm font-semibold ${STATUS_TEXT[m.status]}`}>
          {m.status === 'run' ? 'Running' : (m.stopReason ?? STATUS_LABEL[m.status])}
        </span>
      </div>
      <div className="mb-3 truncate text-sm text-dim">{m.part}</div>
      <div className="grid grid-cols-2 gap-2">
        <Reading icon={Gauge} label="Motor current" value={`${num(m.currentA, 1)} A`} />
        <Reading icon={Thermometer} label={m.kind === 'press' ? 'Oil temp' : 'Mould temp'} value={`${num(m.tempC, 1)} °C`} warn={m.tempC > 70} />
        <Reading icon={Zap} label="Power" value={`${num(m.kW, 1)} kW`} />
        <Reading icon={Timer} label="Cycle" value={m.status === 'run' ? `${num(m.cycleS, 1)} s` : '—'} />
      </div>
      <Timeline m={m} />
      <div className="mt-3 flex justify-end">
        {m.status === 'run' ? (
          <button onClick={() => report(m.id, 'Emergency stop pressed')} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-dim hover:border-stop hover:text-stop">
            <Power size={14} /> Simulate a stop
          </button>
        ) : m.status === 'idle' ? (
          <button onClick={() => setStatus(m.id, 'run')} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-dim hover:border-run hover:text-run">
            <Play size={14} /> Start
          </button>
        ) : (
          <span className="py-1.5 text-xs text-stop">Waiting for technician</span>
        )}
      </div>
    </Card>
  )
}

/** Last hour as coloured bands: green running, amber idle, red stopped. */
function Timeline({ m }: { m: Machine }) {
  const now = useStore((s) => s.simTime)
  const from = now - HOUR
  const bands = m.segments
    .map((seg, i) => ({
      status: seg.status,
      start: Math.max(seg.start, from),
      end: i + 1 < m.segments.length ? m.segments[i + 1].start : now,
    }))
    .filter((b) => b.end > from)
  return (
    <div className="mt-3">
      <div className="relative h-4 overflow-hidden rounded bg-panel-2">
        {bands.map((b) => (
          <div
            key={b.start}
            className={`absolute inset-y-0 ${STATUS_COLOR[b.status]}`}
            style={{ left: `${((b.start - from) / HOUR) * 100}%`, width: `${((b.end - b.start) / HOUR) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-dim">
        <span>1 hour ago</span>
        <span>30 min</span>
        <span>now</span>
      </div>
    </div>
  )
}
