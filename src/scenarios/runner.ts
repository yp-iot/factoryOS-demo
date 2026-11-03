import { useStore, type Store } from '../sim/store'

export interface Step {
  caption: string
  run?: () => void
  /** Real milliseconds before the next step. */
  wait?: number
  /** Hold here until the presenter does something on screen. */
  until?: (s: Store) => boolean
  hint?: string
  /** What "Next" does if the presenter skips an `until` step. */
  skip?: () => void
}

export interface Scenario {
  id: string
  title: string
  blurb: string
  concept?: boolean
  steps: Step[]
}

let active: { scenario: Scenario; index: number; timer?: number; unsub?: () => void } | null = null

function clear() {
  if (!active) return
  window.clearTimeout(active.timer)
  active.unsub?.()
  active.timer = undefined
  active.unsub = undefined
}

function show(index: number, done = false) {
  if (!active) return
  const { scenario } = active
  const step = scenario.steps[index]
  useStore.getState().setScenario({
    id: scenario.id,
    title: scenario.title,
    step: index + 1,
    total: scenario.steps.length,
    caption: step.caption,
    hint: !done && step.until ? (step.hint ?? null) : null,
    done,
  })
}

function goTo(index: number) {
  if (!active) return
  clear()
  const { scenario } = active
  active.index = index
  const step = scenario.steps[index]
  step.run?.()
  const last = index === scenario.steps.length - 1
  show(index, last && !step.until)

  const advance = (delay: number) => {
    if (!active) return
    if (last) return show(index, true)
    active.timer = window.setTimeout(() => goTo(index + 1), delay)
  }

  if (step.until) {
    if (step.until(useStore.getState())) return advance(1200)
    active.unsub = useStore.subscribe((s) => {
      if (active && step.until!(s)) {
        active.unsub?.()
        active.unsub = undefined
        advance(1500)
      }
    })
  } else if (!last) {
    advance(step.wait ?? 3000)
  }
}

export function runScenario(scenario: Scenario) {
  stopScenario()
  active = { scenario, index: 0 }
  useStore.getState().setScenariosOpen(false)
  goTo(0)
}

export function nextStep() {
  if (!active) return
  const step = active.scenario.steps[active.index]
  if (step.until && !step.until(useStore.getState())) step.skip?.()
  if (active.index + 1 < active.scenario.steps.length) goTo(active.index + 1)
  else stopScenario()
}

export function stopScenario() {
  clear()
  active = null
  useStore.getState().setScenario(null)
}
