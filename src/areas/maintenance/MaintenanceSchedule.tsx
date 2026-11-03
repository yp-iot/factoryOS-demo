import { CalendarClock, Check } from 'lucide-react'
import { AppHeader, Button, Card } from '../../components/ui'
import { date } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { useStore } from '../../sim/store'

const DAY = 86400000

// Due dates are days from the demo start; negative means overdue.
const TASKS = [
  { id: 'PM-118', machine: 'M4', task: 'Hydraulic oil and filter change', every: 'Every 6 months', dueIn: -3, tech: 'Hafiz' },
  { id: 'PM-121', machine: 'P1', task: 'Press guard and interlock check', every: 'Monthly', dueIn: -1, tech: 'Ali' },
  { id: 'PM-119', machine: 'M1', task: 'Mould cleaning and vent check', every: 'Every 2 weeks', dueIn: 0, tech: 'Kumar' },
  { id: 'PM-122', machine: 'M3', task: 'Heater band and thermocouple check', every: 'Monthly', dueIn: 1, tech: 'Ali' },
  { id: 'PM-120', machine: 'M2', task: 'Screw and barrel wear check', every: 'Every 3 months', dueIn: 3, tech: 'Hafiz' },
  { id: 'PM-123', machine: 'Compressor', task: 'Drain and air filter', every: 'Weekly', dueIn: 4, tech: 'Kumar' },
  { id: 'PM-124', machine: 'M5', task: 'Lubrication of toggle and tie bars', every: 'Monthly', dueIn: 6, tech: 'Ali' },
  { id: 'PM-125', machine: 'M6', task: 'Chiller water check', every: 'Every 2 weeks', dueIn: 9, tech: 'Kumar' },
]

export function MaintenanceSchedule() {
  const now = useStore((s) => s.simTime)
  const [done, setDone] = useAppState<string[]>('pm-done', () => [])
  const open = TASKS.filter((t) => !done.includes(t.id))
  const overdue = open.filter((t) => t.dueIn < 0).length

  return (
    <div>
      <AppHeader app="pm-schedule">
        <div className={`rounded-lg px-3 py-2 font-semibold ${overdue ? 'bg-stop/15 text-stop' : 'bg-run/15 text-run'}`}>
          {overdue ? `${overdue} overdue` : 'Nothing overdue'}
        </div>
      </AppHeader>
      <Card className="p-0">
        {TASKS.map((t) => {
          const isDone = done.includes(t.id)
          const late = !isDone && t.dueIn < 0
          const today = !isDone && t.dueIn === 0
          return (
            <div key={t.id} className={`flex items-center gap-4 border-b border-line/50 px-4 py-3 last:border-0 ${late ? 'bg-stop/[0.07]' : ''}`}>
              <CalendarClock size={20} className={late ? 'text-stop' : today ? 'text-idle' : 'text-dim'} />
              <div className="w-28">
                <div className={`font-semibold ${late ? 'text-stop' : ''}`}>{date(now + t.dueIn * DAY)}</div>
                <div className={`text-xs ${late ? 'text-stop' : today ? 'text-idle' : 'text-dim'}`}>
                  {isDone ? 'Done' : late ? `${-t.dueIn} day${t.dueIn === -1 ? '' : 's'} overdue` : today ? 'Due today' : `In ${t.dueIn} days`}
                </div>
              </div>
              <div className="w-24 font-bold">{t.machine}</div>
              <div className="flex-1">
                <div className={isDone ? 'text-dim line-through' : ''}>{t.task}</div>
                <div className="text-xs text-dim">
                  {t.id} · {t.every} · {t.tech}
                </div>
              </div>
              {isDone ? (
                <span className="flex items-center gap-1 text-sm text-run">
                  <Check size={16} /> Done
                </span>
              ) : (
                <Button variant="ghost" onClick={() => setDone((d) => [...d, t.id])}>
                  Mark done
                </Button>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
