import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { AREAS } from '../areas/registry'
import { Card, STATUS_LABEL, STATUS_TEXT, StatusLight } from '../components/ui'
import { num, pct, rm } from '../lib/format'
import { dailyUsage, plantOee } from '../sim/engine'
import { FLOOR_WORKERS } from '../sim/seedOps'
import { useStore, type Store } from '../sim/store'
import type { AreaId } from '../sim/types'

interface Figure {
  label: string
  value: ReactNode
  tone?: string
}

/** The one or two live numbers each area card shows. */
function figures(area: AreaId, s: Store): Figure[] {
  const ms = s.machines
  const good = ms.reduce((a, m) => a + m.good, 0)
  const scrap = ms.reduce((a, m) => a + m.scrap, 0)
  switch (area) {
    case 'production':
      return [
        { label: 'Good parts today', value: num(good) },
        { label: 'Plant OEE', value: pct(plantOee(ms)) },
      ]
    case 'maintenance': {
      const running = ms.filter((m) => m.status === 'run').length
      const open = s.breakdowns.filter((b) => b.end === null).length
      return [
        { label: 'Running', value: `${running} / ${ms.length}`, tone: running === ms.length ? 'text-run' : 'text-ink' },
        { label: 'Open breakdowns', value: open, tone: open ? 'text-stop' : 'text-run' },
      ]
    }
    case 'quality':
      return [
        { label: 'Scrap rate', value: pct(scrap / Math.max(1, good + scrap), 1) },
        { label: 'Rejects today', value: num(scrap) },
      ]
    case 'stores': {
      const pp = s.materials.find((m) => m.id === 'pp')!
      const perDay = dailyUsage(ms).pp
      return [
        { label: 'PP resin', value: `${num(pp.balance)} kg`, tone: pp.balance <= pp.reorderLevel ? 'text-idle' : 'text-ink' },
        { label: 'PP days left at this rate', value: perDay > 0 ? (pp.balance / perDay).toFixed(1) : '—' },
      ]
    }
    case 'energy': {
      const kWh = ms.reduce((a, m) => a + m.kWh, 0)
      const kW = ms.reduce((a, m) => a + m.kW, 0)
      return [
        { label: 'Power cost today', value: rm(kWh * s.ratePerKWh, 0) },
        { label: 'Drawing now', value: `${num(kW)} kW` },
      ]
    }
    case 'people': {
      const sos = s.sos.some((a) => a.cleared === null)
      return [
        { label: sos ? 'SOS alert active' : 'Badges on the floor', value: sos ? 'SOS' : FLOOR_WORKERS.length, tone: sos ? 'text-stop' : 'text-ink' },
        { label: 'On site from the gate', value: s.gate.filter((g) => g.out === null).length },
      ]
    }
  }
}

export function Home() {
  const s = useStore()
  return (
    <div className="flex h-full min-h-[34rem] flex-col gap-5">
      <MachineStrip />
      <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-4">
        {AREAS.map((a) => (
          <button key={a.id} onClick={() => s.go({ kind: 'area', area: a.id })} className="text-left">
            <Card className="flex h-full flex-col transition hover:border-accent/60 hover:bg-panel-2">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-panel-2 text-accent">
                  <a.icon size={22} />
                </span>
                <span className="flex-1 text-lg font-semibold">{a.name}</span>
                <ChevronRight className="text-dim" size={20} />
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3">
                {figures(a.id, s).map((f) => (
                  <div key={f.label}>
                    <div className={`tabular text-4xl font-bold ${f.tone ?? ''}`}>{f.value}</div>
                    <div className="text-sm text-dim">{f.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

function MachineStrip() {
  const machines = useStore((s) => s.machines)
  const openApp = useStore((s) => s.openApp)
  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold tracking-wide text-dim uppercase">Machines now</span>
        <span className="text-xs text-dim">Output today · good parts</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {machines.map((m) => (
          <button
            key={m.id}
            onClick={() => openApp('machine-status')}
            className={`rounded-lg border bg-panel-2 px-3 py-2.5 text-left transition hover:border-accent/60 ${
              m.status === 'stop' ? 'border-stop' : 'border-line'
            }`}
          >
            <div className="flex items-center gap-2">
              <StatusLight status={m.status} size="lg" />
              <span className="text-xl font-bold">{m.id}</span>
            </div>
            <div className="tabular mt-1 text-2xl font-bold">{num(m.good)}</div>
            <div className={`text-xs font-medium ${STATUS_TEXT[m.status]}`}>
              {m.status === 'run' ? STATUS_LABEL.run : (m.stopReason ?? STATUS_LABEL[m.status])}
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}
