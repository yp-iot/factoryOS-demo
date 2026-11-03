import { Pause, PlayCircle, RotateCcw, Smartphone } from 'lucide-react'
import { clock, date, shiftOf } from '../lib/format'
import { useSimNow } from '../sim/hooks'
import { useStore } from '../sim/store'
import type { Speed } from '../sim/types'
import { stopScenario } from '../scenarios/runner'

const SPEEDS: Speed[] = [1, 10, 60]

export function TopBar() {
  const now = useSimNow()
  const { speed, setSpeed, reset, phoneOpen, setPhoneOpen, setScenariosOpen, go } = useStore()

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-panel px-4">
      <button onClick={() => go({ kind: 'home' })} className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-sm font-black text-black">IX</span>
        <span className="text-sm leading-tight font-black tracking-widest">IOTRONIX</span>
      </button>
      <div className="h-8 w-px bg-line" />
      <div className="leading-tight">
        <div className="font-semibold">Demo Plastics Sdn Bhd</div>
        <div className="text-xs text-dim">Plant 1 · 6 moulding machines + 1 press</div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="text-right leading-tight">
          <div className="tabular text-xl font-bold">{clock(now, true)}</div>
          <div className="text-xs text-dim">{date(now)}</div>
        </div>
        <div className="rounded-lg border border-line px-3 py-1 text-center leading-tight">
          <div className="text-[10px] tracking-wider text-dim uppercase">Shift</div>
          <div className="font-bold">{shiftOf(now)}</div>
        </div>

        <span className="rounded-full border border-info/50 bg-info/10 px-3 py-1 text-xs font-semibold text-info">Simulated demo</span>

        <div className="flex items-center rounded-lg border border-line bg-panel-2 p-0.5" title="Simulation speed">
          <button
            onClick={() => setSpeed(0)}
            className={`rounded-md px-2 py-1 ${speed === 0 ? 'bg-accent text-black' : 'text-dim hover:text-ink'}`}
            aria-label="Pause"
          >
            <Pause size={15} />
          </button>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`tabular rounded-md px-2 py-1 text-sm font-semibold ${speed === s ? 'bg-accent text-black' : 'text-dim hover:text-ink'}`}
            >
              {s}×
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            stopScenario()
            reset()
          }}
          className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-dim hover:text-ink"
        >
          <RotateCcw size={15} /> Reset
        </button>
        <button
          onClick={() => setPhoneOpen(!phoneOpen)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${phoneOpen ? 'border-accent text-accent' : 'border-line text-dim hover:text-ink'}`}
        >
          <Smartphone size={15} /> Phone view
        </button>
        <button
          onClick={() => setScenariosOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-bold text-black hover:bg-amber-400"
        >
          <PlayCircle size={16} /> Scenarios
        </button>
      </div>
    </header>
  )
}
