import { CheckCircle2, FileText, UserRoundCheck } from 'lucide-react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, minutes, num, shiftOf } from '../../lib/format'
import { plantOee } from '../../sim/engine'
import { useAppState } from '../../sim/hooks'
import { acknowledgeHandover, approver, setOnLeave } from '../../sim/ops'
import { dayStart } from '../../sim/seed'
import { BACKUP_SUPERVISOR, SUPERVISOR } from '../../sim/seedOps'
import { useStore } from '../../sim/store'

export function ShiftHandover() {
  const s = useStore()
  const [notes, setNotes] = useAppState('handover-notes', () => '')
  const now = s.simTime
  const shift = shiftOf(now)
  const good = s.machines.reduce((a, m) => a + m.good, 0)
  const scrap = s.machines.reduce((a, m) => a + m.scrap, 0)
  const stops = s.breakdowns.filter((b) => b.start >= dayStart(now))
  const downMin = stops.reduce((a, b) => a + minutes((b.end ?? now) - b.start), 0)
  const notRunning = s.machines.filter((m) => m.status !== 'run')
  const lowStock = s.materials.filter((m) => m.balance <= m.reorderLevel)
  const openNcrs = s.ncrs.filter((n) => n.status !== 'Closed')
  const to = approver()

  const issues = [
    ...notRunning.map((m) => `${m.id} ${m.status === 'stop' ? 'stopped' : 'idle'}: ${m.stopReason ?? 'no reason given'}`),
    ...lowStock.map((m) => `${m.name} below reorder level (${num(m.balance)} ${m.unit})`),
    ...openNcrs.map((n) => `${n.id} open: ${n.part}, ${n.defect.toLowerCase()}`),
  ]

  return (
    <div>
      <AppHeader app="shift-handover" />
      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-accent">
            <FileText size={16} /> Drafted automatically at {clock(now)}
          </div>
          <h2 className="mb-3 text-2xl font-bold">Shift {shift} handover</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
            {[
              ['Good parts', num(good)],
              ['Rejects', num(scrap)],
              ['Plant OEE', `${Math.round(plantOee(s.machines) * 100)}%`],
              ['Downtime', `${downMin} min`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-panel-2 px-3 py-2">
                <div className="text-xs text-dim uppercase">{k}</div>
                <div className="tabular text-2xl font-bold">{v}</div>
              </div>
            ))}
          </div>
          <h3 className="mb-1 font-semibold">Stops this shift</h3>
          <ul className="mb-4 space-y-1 text-sm">
            {stops.map((b) => (
              <li key={b.id} className="flex gap-2">
                <span className="w-12 text-dim">{clock(b.start)}</span>
                <b className="w-8">{b.machineId}</b>
                <span className="flex-1">{b.reason ?? b.alarm}</span>
                <span className="tabular text-dim">{b.end ? `${minutes(b.end - b.start)} min` : 'still down'}</span>
              </li>
            ))}
          </ul>
          <h3 className="mb-1 font-semibold">For the next shift</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className={s.supervisorOnLeave ? 'border-info/60' : ''}>
            <div className="text-xs text-dim uppercase">Goes to</div>
            <div className="flex items-center gap-2 text-xl font-bold">
              <UserRoundCheck size={20} className="text-accent" /> {to}
            </div>
            <div className="text-sm text-dim">{s.supervisorOnLeave ? `Backup, while ${SUPERVISOR} is on leave` : 'Shift supervisor'}</div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.supervisorOnLeave} onChange={(e) => setOnLeave(e.target.checked)} className="h-4 w-4 accent-amber-500" />
              {SUPERVISOR} on leave today
              <span className="rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-bold text-info uppercase">Concept</span>
            </label>
            <div className="mt-1 text-xs text-dim">Backup: {BACKUP_SUPERVISOR}. Backup approvers are a concept, not yet confirmed in the product.</div>
          </Card>
          <Card>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Notes from the shift</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Anything the next shift should know…"
                className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 flex items-center justify-end gap-3">
              {s.handover.ackBy && (
                <span className="flex items-center gap-1.5 text-sm text-run">
                  <CheckCircle2 size={16} /> {s.handover.ackBy}, {clock(s.handover.ackAt!)}
                </span>
              )}
              <Button variant="ok" onClick={() => acknowledgeHandover(notes)}>
                Acknowledge
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
