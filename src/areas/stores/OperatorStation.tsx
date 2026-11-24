import { ArrowRight, BatteryFull, Check, ChevronLeft, ClipboardCheck, Delete, PackageMinus, PackagePlus, ScanLine, Signal, Truck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Card } from '../../components/ui'
import { clock, num } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { skuOf, WH_OPERATORS } from '../../sim/stock'
import { useStore } from '../../sim/store'
import { completeTask, countFinds, warehouseTasks, type TaskKind, type WhTask } from '../../sim/warehouse'
import { TxnChip } from './TxnChip'
import { qtyText } from './whShared'

const KIND: Record<TaskKind, { icon: LucideIcon; tone: string }> = {
  Pick: { icon: PackageMinus, tone: 'bg-idle/20 text-idle' },
  'Put away': { icon: PackagePlus, tone: 'bg-run/20 text-run' },
  Dispatch: { icon: Truck, tone: 'bg-accent/20 text-accent' },
  Count: { icon: ClipboardCheck, tone: 'bg-info/20 text-info' },
}

/** The steps on the handheld. The last one finishes the task. */
function stepsFor(t: WhTask) {
  const code = skuOf(t.sku).code
  switch (t.kind) {
    case 'Pick':
      return [`Scan bay ${t.from}`, `Scan ${code}`, `Take ${num(t.qty)} ${t.unit}`, `Drop at ${t.to}`]
    case 'Put away':
      return [`Scan pallet at ${t.from}`, `Scan bay ${t.to}`, `Confirm ${num(t.qty)} ${t.unit}`]
    case 'Dispatch':
      return [`Scan ${t.ref}`, `Pick from ${t.from}`, `Load at ${t.to}`]
    case 'Count':
      return [`Scan bay ${t.from}`, 'Count what is there', 'Confirm count']
  }
}

interface Done {
  title: string
  note: string
}

export function OperatorStation() {
  const s = useStore()
  const tasks = warehouseTasks(s)
  const [user, setUser] = useAppState('op-user', () => WH_OPERATORS[0])
  const [taskId, setTaskId] = useAppState<string | null>('op-task', () => null)
  const [step, setStep] = useAppState('op-step', () => 0)
  const [done, setDone] = useAppState<Done | null>('op-done', () => null)
  const task = tasks.find((t) => t.id === taskId) ?? null

  const finish = (t: WhTask, counted?: number) => {
    const before = useStore.getState().wh.txns[0]?.id
    completeTask(t, user, counted)
    const after = useStore.getState().wh.txns[0]
    const wrote = after && after.id !== before
    const diff = counted !== undefined ? counted - t.qty : 0
    setDone({
      title: t.kind === 'Count' ? (diff ? `Count saved · ${diff > 0 ? '+' : '−'}${num(Math.abs(diff))} ${t.unit}` : 'Count matches') : `${t.kind} done`,
      note: wrote ? `${after.id} written · stock updated` : 'Nothing to adjust',
    })
    setTaskId(null)
    setStep(0)
  }

  return (
    <div>
      <AppHeader app="operator-station" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        {/* The handheld stays dark in either theme, like the real device. */}
        <div data-theme="dark" className="mx-auto flex h-[40rem] w-full max-w-[25rem] flex-col rounded-[1.8rem] border-[7px] border-slate-700 bg-black text-ink shadow-2xl">
          <div className="flex items-center gap-2 rounded-t-[1.3rem] bg-slate-800 px-4 py-2 text-xs">
            <ScanLine size={14} className="text-accent" />
            <span className="font-semibold">Handheld 2</span>
            <select value={user} onChange={(e) => setUser(e.target.value)} className="rounded bg-slate-700 px-1.5 py-0.5 text-xs" aria-label="Operator">
              {WH_OPERATORS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <span className="tabular ml-auto">{clock(s.simTime)}</span>
            <Signal size={12} />
            <BatteryFull size={14} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-900 to-slate-950 p-3">
            {done ? (
              <DoneScreen done={done} onNext={() => setDone(null)} />
            ) : task ? (
              <TaskScreen task={task} step={step} setStep={setStep} onBack={() => {
                  setTaskId(null)
                  setStep(0)
                }} onFinish={finish} />
            ) : (
              <Queue tasks={tasks} user={user} onPick={(t) => {
                  setTaskId(t.id)
                  setStep(0)
                }} />
            )}
          </div>
        </div>
        <Feed />
      </div>
    </div>
  )
}

function Queue({ tasks, user, onPick }: { tasks: WhTask[]; user: string; onPick: (t: WhTask) => void }) {
  const urgent = tasks.filter((t) => t.urgent).length
  return (
    <>
      <div className="mb-3">
        <div className="text-lg font-bold">Hi {user}</div>
        <div className="text-sm text-dim">
          {tasks.length} tasks{urgent ? ` · ${urgent} urgent` : ''}, most urgent first
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {tasks.length === 0 && <div className="mt-10 text-center text-dim">All done. Nothing waiting.</div>}
        {tasks.map((t) => {
          const k = KIND[t.kind]
          return (
            <button key={t.id} onClick={() => onPick(t)} className={`slide-in rounded-xl border bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.08] ${t.urgent ? 'border-idle/60' : 'border-white/10'}`}>
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${k.tone}`}>
                  <k.icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="truncate text-xs text-dim">{t.why}</div>
                </div>
                {t.urgent && <span className="rounded bg-idle px-1.5 py-0.5 text-[10px] font-bold text-black uppercase">Urgent</span>}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                {/* A count is blind: the queue does not give away the system figure. */}
                <span className="tabular shrink-0 font-semibold">{t.kind === 'Count' ? 'Blind count' : `${num(t.qty)} ${t.unit}`}</span>
                <span className="ml-auto flex min-w-0 items-center gap-1 truncate text-dim">
                  {t.from} <ArrowRight size={11} /> {t.to}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function TaskScreen({ task, step, setStep, onBack, onFinish }: { task: WhTask; step: number; setStep: (n: number) => void; onBack: () => void; onFinish: (t: WhTask, counted?: number) => void }) {
  const steps = stepsFor(task)
  const [scanning, setScanning] = useState(false)
  const [count, setCount] = useAppState('op-count', () => '')
  const k = KIND[task.kind]
  const isCountStep = task.kind === 'Count' && step === 1
  const last = step === steps.length - 1

  const press = () => {
    if (scanning) return
    if (last) {
      onFinish(task, task.kind === 'Count' ? Number(count || 0) : undefined)
      setCount('')
      return
    }
    setScanning(true)
    // A short beep's worth of scanning, then the step ticks off.
    setTimeout(() => {
      setScanning(false)
      setStep(step + 1)
    }, isCountStep ? 0 : 650)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button onClick={onBack} className="mb-2 flex items-center gap-1 self-start text-xs text-dim hover:text-ink">
        <ChevronLeft size={14} /> Back to list
      </button>
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.tone}`}>
          <k.icon size={20} />
        </span>
        <div className="min-w-0">
          <div className="font-bold">{task.title}</div>
          <div className="text-xs text-dim">
            {task.ref} · {skuOf(task.sku).code}
          </div>
        </div>
      </div>

      <ol className="mb-3 flex flex-col gap-1.5 text-sm">
        {steps.map((label, i) => (
          <li key={label} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${i === step ? 'bg-white/[0.08] font-semibold' : i < step ? 'text-run' : 'text-dim'}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i < step ? 'bg-run text-black' : i === step ? 'bg-accent text-black' : 'bg-white/10'}`}>
              {i < step ? <Check size={12} /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {isCountStep && (
        <Keypad value={count} setValue={setCount} unit={task.unit} onTally={() => setCount(String(countFinds(useStore.getState(), task.ref)))} />
      )}

      <button
        onClick={press}
        disabled={isCountStep && count === ''}
        className={`relative mt-auto flex items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-base font-bold transition disabled:opacity-40 ${last ? 'bg-run text-black' : 'bg-accent text-black'}`}
      >
        {scanning && <span className="scan-line absolute inset-y-0 w-1/3 bg-white/40" />}
        {last ? <Check size={20} /> : <ScanLine size={20} />}
        {scanning ? 'Scanning…' : isCountStep ? 'Next' : last ? 'Finish' : steps[step]}
      </button>
    </div>
  )
}

/** Blind count: the system figure stays hidden, so the count is honest. */
function Keypad({ value, setValue, unit, onTally }: { value: string; setValue: (v: string) => void; unit: string; onTally: () => void }) {
  const key = (k: string) => setValue(k === 'del' ? value.slice(0, -1) : (value + k).replace(/^0+(?=\d)/, '').slice(0, 6))
  return (
    <div className="mb-3">
      <div className="mb-2 flex items-baseline justify-between rounded-lg bg-white/[0.06] px-3 py-2">
        <span className="tabular text-3xl font-bold">{value || '0'}</span>
        <span className="text-sm text-dim">{unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'tally', '0', 'del'].map((k) => (
          <button
            key={k}
            onClick={() => (k === 'tally' ? onTally() : key(k))}
            className="flex items-center justify-center rounded-lg bg-white/[0.07] py-2 text-lg font-semibold hover:bg-white/[0.12]"
            aria-label={k === 'del' ? 'Delete' : undefined}
          >
            {k === 'del' ? <Delete size={18} /> : k === 'tally' ? <span className="text-xs">Scale</span> : k}
          </button>
        ))}
      </div>
      <div className="mt-1.5 text-[11px] text-dim">Blind count: the system figure is hidden. "Scale" reads the floor scale.</div>
    </div>
  )
}

function DoneScreen({ done, onNext }: { done: Done; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <span className="slide-in grid h-20 w-20 place-items-center rounded-full bg-run text-black">
        <Check size={40} strokeWidth={3} />
      </span>
      <div className="text-xl font-bold">{done.title}</div>
      <div className="text-sm text-dim">{done.note}</div>
      <button onClick={onNext} className="mt-4 rounded-xl bg-accent px-8 py-3 font-bold text-black">
        Next task
      </button>
    </div>
  )
}

/** What the office sees while the operator scans. */
function Feed() {
  const txns = useStore((s) => s.wh.txns)
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-1 font-semibold">Every scan updates stock</h2>
        <p className="text-sm text-dim">
          The handheld guides the operator bay by bay. Each finished task writes one transaction line, moves the stock, and shows up on the
          map and the manager's dashboard straight away. No paper, no typing it in later.
        </p>
      </Card>
      <Card className="p-0">
        <h2 className="px-4 pt-4 pb-2 font-semibold">Latest transactions</h2>
        <ul className="text-sm">
          {txns.slice(0, 8).map((t) => (
            <li key={t.id} className="slide-in flex items-center gap-3 border-t border-line/50 px-4 py-2.5">
              <span className="tabular w-11 text-xs text-dim">{clock(t.t)}</span>
              <TxnChip type={t.type} />
              <span className="min-w-0 flex-1 truncate">
                {skuOf(t.sku).name} <span className="text-dim">· {t.by}</span>
              </span>
              <span className={`tabular text-xs font-semibold ${t.qty > 0 ? 'text-run' : t.qty < 0 ? 'text-stop' : 'text-dim'}`}>{qtyText(t.sku, t.qty)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
