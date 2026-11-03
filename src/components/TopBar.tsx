import { Moon, MoreVertical, Pause, PlayCircle, RotateCcw, Smartphone, Sun } from 'lucide-react'
import { useState } from 'react'
import { clock, date, shiftOf } from '../lib/format'
import { useSimNow } from '../sim/hooks'
import { useStore } from '../sim/store'
import type { Speed } from '../sim/types'
import { stopScenario } from '../scenarios/runner'

const SPEEDS: Speed[] = [1, 10, 60]

/** Speed, Reset, theme and Phone view. In the bar on a wide screen, in a menu on a phone. */
function Controls({ onDone }: { onDone?: () => void }) {
  const { speed, setSpeed, reset, phoneOpen, setPhoneOpen, theme, toggleTheme } = useStore()
  return (
    <>
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
            className={`tabular flex-1 rounded-md px-2 py-1 text-sm font-semibold ${speed === s ? 'bg-accent text-black' : 'text-dim hover:text-ink'}`}
          >
            {s}×
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          stopScenario()
          reset()
          onDone?.()
        }}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-dim hover:text-ink"
      >
        <RotateCcw size={15} /> Reset
      </button>
      <button
        onClick={toggleTheme}
        className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line px-2.5 text-sm text-dim hover:text-ink"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        <span className="xl:hidden">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      </button>
      <button
        onClick={() => {
          setPhoneOpen(!phoneOpen)
          onDone?.()
        }}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${phoneOpen ? 'border-accent text-accent' : 'border-line text-dim hover:text-ink'}`}
      >
        <Smartphone size={15} /> Phone view
      </button>
    </>
  )
}

export function TopBar() {
  const now = useSimNow()
  const { setScenariosOpen, go } = useStore()
  const [menu, setMenu] = useState(false)

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-3 sm:gap-4 sm:px-4 lg:h-16">
      <div className="hazard absolute inset-x-0 top-0 h-1" />
      <button onClick={() => go({ kind: 'home' })} className="flex shrink-0 items-center gap-2.5">
        <img src="/factoryos-mark.png" alt="" className="h-9 w-9 rounded-[22%] lg:h-10 lg:w-10" />
        <span className="hidden text-left leading-none sm:block">
          <span className="block text-xl font-extrabold tracking-tight">
            Factory<span className="text-accent">OS</span>
          </span>
          <span className="text-[10px] font-semibold tracking-[0.18em] text-dim uppercase">by Iotronix</span>
        </span>
      </button>
      <div className="hidden h-8 w-px bg-line lg:block" />
      <div className="hidden leading-tight lg:block">
        <div className="font-semibold">Demo Plastics Sdn Bhd</div>
        <div className="text-xs text-dim">Plant 1 · 6 moulding machines + 1 press</div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="text-right leading-tight">
          <div className="tabular text-base font-bold lg:text-xl">{clock(now, true)}</div>
          <div className="hidden text-xs text-dim sm:block">{date(now)}</div>
        </div>
        <div className="hidden rounded-lg border border-line px-3 py-1 text-center leading-tight sm:block">
          <div className="text-[10px] tracking-wider text-dim uppercase">Shift</div>
          <div className="font-bold">{shiftOf(now)}</div>
        </div>

        {/* Always visible, on every screen size. */}
        <span className="rounded-full border border-info/50 bg-info/10 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-info sm:px-3 sm:text-xs">
          Simulated demo
        </span>

        <div className="hidden items-center gap-4 xl:flex">
          <Controls />
        </div>

        <button
          onClick={() => setScenariosOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-2 text-sm font-bold text-black hover:bg-amber-400 sm:px-3.5"
          aria-label="Scenarios"
        >
          <PlayCircle size={16} /> <span className="hidden sm:inline">Scenarios</span>
        </button>

        <div className="relative xl:hidden">
          <button onClick={() => setMenu(!menu)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-dim hover:text-ink" aria-label="More controls">
            <MoreVertical size={18} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="slide-in absolute top-11 right-0 z-50 flex w-60 flex-col gap-2 rounded-xl border border-line bg-panel p-3 shadow-2xl shadow-black/30">
                <div className="text-xs text-dim sm:hidden">
                  {date(now)} · Shift {shiftOf(now)}
                </div>
                <Controls onDone={() => setMenu(false)} />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
