import { Play, SkipForward, Square, X } from 'lucide-react'
import { SCENARIOS } from '../scenarios'
import { nextStep, runScenario, stopScenario } from '../scenarios/runner'
import { useStore } from '../sim/store'

export function ScenariosPanel() {
  const open = useStore((s) => s.scenariosOpen)
  const setOpen = useStore((s) => s.setScenariosOpen)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setOpen(false)}>
      <aside className="slide-in flex h-full w-[26rem] flex-col border-l border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Scenarios</h2>
          <button onClick={() => setOpen(false)} className="text-dim hover:text-ink" aria-label="Close">
            <X />
          </button>
        </div>
        <p className="mb-5 text-sm text-dim">One click plays a short story. A caption at the bottom tells you what is happening.</p>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {SCENARIOS.map((build, i) => {
            const sc = build()
            return (
              <button
                key={sc.id}
                onClick={() => runScenario(build())}
                className="flex items-start gap-3 rounded-xl border border-line bg-panel-2 p-4 text-left transition hover:border-accent"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-black">{i + 1}</span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {sc.title}
                    {sc.concept && <span className="rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-bold text-info uppercase">Concept</span>}
                  </span>
                  <span className="block text-sm text-dim">{sc.blurb}</span>
                </span>
                <Play className="mt-1 text-accent" size={18} />
              </button>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

/** The narration bar the presenter reads from while a scenario plays. */
export function ScenarioCaption() {
  const sc = useStore((s) => s.scenario)
  if (!sc) return null
  return (
    <div className="fixed bottom-5 left-1/2 z-30 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="slide-in flex items-center gap-4 rounded-2xl border border-accent/60 bg-panel/95 px-5 py-4 shadow-2xl shadow-black/60 backdrop-blur">
        <div className="shrink-0 text-center">
          <div className="text-[10px] font-semibold tracking-wider text-accent uppercase">{sc.title}</div>
          <div className="tabular text-lg font-bold">
            {sc.step}/{sc.total}
          </div>
        </div>
        <div className="h-10 w-px bg-line" />
        <div className="flex-1">
          <div className="text-lg leading-snug font-semibold" key={sc.caption}>
            {sc.caption}
          </div>
          {sc.hint && <div className="mt-0.5 text-sm text-accent">{sc.hint}</div>}
        </div>
        {!sc.done && (
          <button onClick={nextStep} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-panel-2">
            <SkipForward size={16} /> Next
          </button>
        )}
        <button
          onClick={stopScenario}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${sc.done ? 'bg-accent text-black' : 'border border-line hover:bg-panel-2'}`}
        >
          {sc.done ? 'Done' : <><Square size={14} /> Stop</>}
        </button>
      </div>
    </div>
  )
}
