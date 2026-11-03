import { FilePlus2, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { dateTime, num } from '../../lib/format'
import { createNcr, setNcrStatus } from '../../sim/ops'
import { useStore } from '../../sim/store'
import type { MachineId, Ncr } from '../../sim/types'

const CHIP: Record<Ncr['status'], string> = {
  Draft: 'bg-accent/15 text-accent',
  Open: 'bg-stop/15 text-stop',
  Closed: 'bg-slate-500/20 text-dim',
}

export function NcrReturns() {
  const ncrs = useStore((s) => s.ncrs)
  const [form, setForm] = useState(false)
  return (
    <div>
      <AppHeader app="ncr">
        <Button onClick={() => setForm(true)}>
          <FilePlus2 size={16} /> Open NCR
        </Button>
      </AppHeader>
      {form && <NcrForm onClose={() => setForm(false)} />}
      <div className="flex flex-col gap-3">
        {ncrs.map((n) => (
          <Card key={n.id} className={`slide-in flex items-center gap-4 ${n.status === 'Draft' ? 'border-accent/60' : ''}`}>
            <div className="w-28">
              <div className="font-bold">{n.id}</div>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${CHIP[n.status]}`}>{n.status}</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold">
                {n.part} · {n.machineId}
              </div>
              <div className="text-sm">{n.defect}</div>
              <div className="flex items-center gap-1.5 text-xs text-dim">
                {n.source === 'AI camera' && <Sparkles size={12} className="text-accent" />}
                {n.source} · {dateTime(n.t)} · {n.owner}
              </div>
            </div>
            <div className="text-right">
              <div className="tabular text-2xl font-bold">{num(n.qty)}</div>
              <div className="text-xs text-dim">parts</div>
            </div>
            <div className="w-36 text-right">
              {n.status === 'Draft' && <Button onClick={() => setNcrStatus(n.id, 'Open')}>Check & open</Button>}
              {n.status === 'Open' && (
                <Button variant="ghost" onClick={() => setNcrStatus(n.id, 'Closed')}>
                  Close
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function NcrForm({ onClose }: { onClose: () => void }) {
  const machines = useStore((s) => s.machines)
  const [machineId, setMachineId] = useState<MachineId>('M2')
  const [source, setSource] = useState<Ncr['source']>('Customer return')
  const [defect, setDefect] = useState('')
  const [qty, setQty] = useState(100)
  const m = machines.find((x) => x.id === machineId)!
  return (
    <Card className="slide-in mb-4 border-accent/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Open an NCR</h2>
        <button onClick={onClose} className="text-dim hover:text-ink" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 items-end gap-3 text-sm @5xl:grid-cols-[1fr_1fr_2fr_7rem_auto]">
        <label className="flex flex-col gap-1">
          <span className="text-dim">Found by</span>
          <select value={source} onChange={(e) => setSource(e.target.value as Ncr['source'])} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
            <option>Customer return</option>
            <option>Final QC</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">Machine</span>
          <select value={machineId} onChange={(e) => setMachineId(e.target.value as MachineId)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
            {machines.map((x) => (
              <option key={x.id} value={x.id}>
                {x.id} · {x.part}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">What is wrong</span>
          <input value={defect} onChange={(e) => setDefect(e.target.value)} placeholder="e.g. Cracked at the hinge" className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-dim">Quantity</span>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
        </label>
        <Button
          disabled={!defect.trim()}
          onClick={() => {
            createNcr({ source, part: m.part, machineId, defect: defect.trim(), qty, status: 'Open', owner: 'QC' })
            onClose()
          }}
        >
          Open NCR
        </Button>
      </div>
    </Card>
  )
}
