import { Check, ClipboardList, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card, StatusLight } from '../../components/ui'
import { clock, date, dateTime, num } from '../../lib/format'
import { QC_MINUTES, statusOf } from '../../sim/orders'
import { useStore } from '../../sim/store'
import type { MachineId, WorkOrder, WorkOrderStatus } from '../../sim/types'

const STATUS: Record<WorkOrderStatus, { label: string; chip: string; bar: string }> = {
  released: { label: 'Released', chip: 'bg-info/15 text-info', bar: 'bg-info' },
  running: { label: 'Running', chip: 'bg-run/15 text-run', bar: 'bg-run' },
  qc: { label: 'In QC', chip: 'bg-idle/15 text-idle', bar: 'bg-idle' },
  done: { label: 'Done', chip: 'bg-slate-500/20 text-dim', bar: 'bg-slate-500' },
}

const ORDER: WorkOrderStatus[] = ['running', 'released', 'qc', 'done']

export function WorkOrders() {
  const orders = useStore((s) => s.workOrders)
  const [selected, setSelected] = useState('WO-1101')
  const [creating, setCreating] = useState(false)
  const sorted = [...orders].sort((a, b) => ORDER.indexOf(statusOf(a)) - ORDER.indexOf(statusOf(b)) || a.due - b.due)
  const current = orders.find((o) => o.id === selected)

  return (
    <div>
      <AppHeader app="work-orders">
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> Create work order
        </Button>
      </AppHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        {ORDER.map((st) => (
          <div key={st} className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS[st].chip}`}>{STATUS[st].label}</span>
            <span className="tabular text-xl font-bold">{orders.filter((o) => statusOf(o) === st).length}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-dim uppercase">
              <tr className="border-b border-line text-left">
                <th className="py-2.5 pl-4 font-medium">Order</th>
                <th className="font-medium">Part</th>
                <th className="font-medium">Machine</th>
                <th className="w-[30%] font-medium">Progress</th>
                <th className="font-medium">Due</th>
                <th className="pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o) => (
                <Row key={o.id} o={o} active={o.id === selected} onClick={() => setSelected(o.id)} />
              ))}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-4">
          {creating && (
            <CreateForm
              onClose={() => setCreating(false)}
              onCreated={(id) => {
                setSelected(id)
                setCreating(false)
              }}
            />
          )}
          {current && <Detail o={current} />}
        </div>
      </div>
    </div>
  )
}

function Row({ o, active, onClick }: { o: WorkOrder; active: boolean; onClick: () => void }) {
  const machine = useStore((s) => s.machines.find((m) => m.id === o.machineId)!)
  const now = useStore((s) => s.simTime)
  const st = statusOf(o)
  const late = st !== 'done' && o.due < now
  return (
    <tr onClick={onClick} className={`slide-in cursor-pointer border-b border-line/50 last:border-0 hover:bg-panel-2 ${active ? 'bg-accent/10' : ''}`}>
      <td className="py-3 pl-4 font-semibold">{o.id}</td>
      <td className="max-w-40 truncate">{o.part}</td>
      <td>
        <span className="flex items-center gap-1.5 font-semibold">
          <StatusLight status={machine.status} size="sm" /> {o.machineId}
        </span>
      </td>
      <td className="pr-4">
        <div className="tabular mb-1 flex justify-between text-xs">
          <span>
            {num(o.made)} / {num(o.qty)}
          </span>
          <span className="text-dim">{Math.floor((o.made / o.qty) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-panel-2">
          <div className={`h-full rounded-full transition-all duration-700 ${STATUS[st].bar}`} style={{ width: `${(o.made / o.qty) * 100}%` }} />
        </div>
      </td>
      <td className={late ? 'font-semibold text-stop' : 'text-dim'}>{date(o.due)}</td>
      <td className="pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS[st].chip}`}>{STATUS[st].label}</span>
      </td>
    </tr>
  )
}

function Detail({ o }: { o: WorkOrder }) {
  const machine = useStore((s) => s.machines.find((m) => m.id === o.machineId)!)
  const now = useStore((s) => s.simTime)
  const st = statusOf(o)
  const perHour = (3600 / (machine.idealCycleS * 1.04)) * machine.cavities * (1 - machine.scrapRate)
  const left = o.qty - o.made
  const eta = o.startedAt !== null && st === 'running' && machine.status === 'run' ? now + (left / perHour) * 3600000 : null

  const steps: { key: WorkOrderStatus; label: string; at: number | null; note: string }[] = [
    { key: 'released', label: 'Released', at: o.created, note: `${num(o.qty)} × ${o.part}` },
    { key: 'running', label: `Running on ${o.machineId}`, at: o.startedAt, note: o.startedAt ? `${num(o.made)} good parts so far` : `Starts when ${o.machineId} is free` },
    { key: 'qc', label: 'QC check', at: o.qcAt, note: `About ${QC_MINUTES} min once the last part is made` },
    { key: 'done', label: 'Done', at: o.doneAt, note: 'Ready to ship' },
  ]
  const reached = ORDER_FLOW.indexOf(st)

  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <ClipboardList size={18} className="text-accent" />
        <span className="text-xl font-bold">{o.id}</span>
        <span className={`ml-auto rounded px-2 py-0.5 text-xs font-semibold ${STATUS[st].chip}`}>{STATUS[st].label}</span>
      </div>
      <div className="mb-4 text-sm text-dim">
        {o.part} · due {dateTime(o.due)}
      </div>

      <ol className="relative ml-2 border-l-2 border-line">
        {steps.map((step, i) => {
          const isDone = i < reached || st === 'done'
          const isNow = i === reached && st !== 'done'
          return (
            <li key={step.key} className="mb-4 ml-5 last:mb-0">
              <span
                className={`absolute -left-[0.6rem] grid h-5 w-5 place-items-center rounded-full border-2 ${
                  isDone ? 'border-run bg-run text-black' : isNow ? `border-accent bg-panel ${st === 'running' ? 'live-dot' : ''}` : 'border-line bg-panel'
                }`}
              >
                {isDone && <Check size={12} strokeWidth={3} />}
              </span>
              <div className={`font-semibold ${isNow ? 'text-accent' : isDone ? '' : 'text-dim'}`}>{step.label}</div>
              <div className="text-xs text-dim">
                {step.at !== null && i <= reached ? `${dateTime(step.at)} · ` : ''}
                {step.note}
              </div>
            </li>
          )
        })}
      </ol>

      {st === 'running' && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div>
            <div className="text-xs text-dim uppercase">Parts left</div>
            <div className="tabular text-2xl font-bold">{num(left)}</div>
          </div>
          <div>
            <div className="text-xs text-dim uppercase">Finishes about</div>
            <div className="tabular text-2xl font-bold">{eta ? `${date(eta) === date(now) ? '' : date(eta) + ' '}${clock(eta)}` : '—'}</div>
          </div>
        </div>
      )}
    </Card>
  )
}

const ORDER_FLOW: WorkOrderStatus[] = ['released', 'running', 'qc', 'done']

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const machines = useStore((s) => s.machines)
  const orders = useStore((s) => s.workOrders)
  const create = useStore((s) => s.createWorkOrder)
  const busy = (id: MachineId) => orders.find((o) => o.machineId === id && statusOf(o) === 'running')
  const free = machines.find((m) => m.status === 'run' && !busy(m.id))
  const [machineId, setMachineId] = useState<MachineId>(free?.id ?? 'P1')
  const [qty, setQty] = useState(600)
  const [dueDays, setDueDays] = useState(2)
  const m = machines.find((x) => x.id === machineId)!
  const queuedBehind = busy(machineId)

  return (
    <Card className="slide-in border-accent/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">New work order</h2>
        <button onClick={onClose} className="text-dim hover:text-ink" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-dim">Machine</span>
          <select value={machineId} onChange={(e) => setMachineId(e.target.value as MachineId)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
            {machines.map((x) => (
              <option key={x.id} value={x.id}>
                {x.id} · {busy(x.id) ? `busy with ${busy(x.id)!.id}` : x.status === 'run' ? 'free now' : 'not running'}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-dim">Part</span>
          <div className="font-semibold">{m.part}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-dim">Quantity</span>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-dim">Due in (days)</span>
            <input type="number" min={0} value={dueDays} onChange={(e) => setDueDays(Math.max(0, Number(e.target.value) || 0))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
          </label>
        </div>
        <div className="text-xs text-dim">
          {queuedBehind ? `Queues behind ${queuedBehind.id}, then starts by itself.` : m.status === 'run' ? `${machineId} is free. It starts right away.` : `Starts when ${machineId} is running.`}
        </div>
        <Button onClick={() => onCreated(create({ machineId, qty, dueDays }))}>
          <Plus size={16} /> Release order
        </Button>
      </div>
    </Card>
  )
}
