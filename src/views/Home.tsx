import { Activity, ArrowUpRight, Gauge, Package, Zap, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { AREAS } from '../areas/registry'
import { Card, STATUS_COLOR, STATUS_LABEL, STATUS_TEXT, StatusLight } from '../components/ui'
import { date, num, pct, rm, shiftOf } from '../lib/format'
import { dailyUsage, plantOee } from '../sim/engine'
import { useSimNow } from '../sim/hooks'
import { dayStart } from '../sim/seed'
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

const greeting = (t: number) => {
  const h = new Date(t).getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** Share of today's target the plant should have made by now. */
const targetShare = (now: number) => (now - dayStart(now)) / 86400000

export function Home() {
  const s = useStore()
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <Overview />
      <MachineStrip />
      <div>
        <SectionLabel>Areas</SectionLabel>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {AREAS.map((a) => {
            const hero = a.apps.find((app) => app.hero)
            return (
              <button key={a.id} onClick={() => s.go({ kind: 'area', area: a.id })} className="group text-left">
                <Card className="relative flex h-full flex-col overflow-hidden p-5 transition group-hover:-translate-y-0.5 group-hover:border-accent/60 group-hover:shadow-lg group-hover:shadow-black/10">
                  <span className="absolute inset-x-0 top-0 h-1 bg-accent opacity-0 transition group-hover:opacity-100" />
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
                      <a.icon size={22} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-lg leading-tight font-bold">{a.name}</span>
                      <span className="text-xs text-dim">{a.apps.length} apps{hero ? ` · featured: ${hero.name}` : ''}</span>
                    </span>
                    <ArrowUpRight className="text-dim transition group-hover:text-accent" size={20} />
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4">
                    {figures(a.id, s).map((f) => (
                      <div key={f.label} className="min-w-0">
                        <div className={`tabular truncate text-2xl font-bold lg:text-3xl ${f.tone ?? ''}`}>{f.value}</div>
                        <div className="text-xs text-dim lg:text-sm">{f.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="text-xs font-bold tracking-[0.18em] text-accent uppercase">{children}</span>
      {aside && <span className="text-xs text-dim">{aside}</span>}
    </div>
  )
}

/** Greeting plus the four numbers an owner asks for first. */
function Overview() {
  const machines = useStore((s) => s.machines)
  const rate = useStore((s) => s.ratePerKWh)
  const now = useSimNow(1000)

  const good = machines.reduce((a, m) => a + m.good, 0)
  const target = machines.reduce((a, m) => a + m.targetPerDay, 0) * targetShare(now)
  const running = machines.filter((m) => m.status === 'run').length
  const stopped = machines.filter((m) => m.status === 'stop')
  const kWh = machines.reduce((a, m) => a + m.kWh, 0)
  const kW = machines.reduce((a, m) => a + m.kW, 0)
  const vsTarget = good / Math.max(1, target)

  return (
    <Card className="relative overflow-hidden p-0">
      {/* A soft amber glow behind the greeting, the poster's accent. */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:gap-8 lg:p-6">
        <div className="lg:w-64 lg:shrink-0">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-run">
            <span className="live-dot h-2 w-2 rounded-full bg-run" /> Live from the floor
          </div>
          <h1 className="text-2xl leading-tight font-bold lg:text-[1.7rem]">{greeting(now)}.</h1>
          <p className="text-sm text-dim">
            Plant 1 · {date(now)} · Shift {shiftOf(now)}
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Package} label="Good parts today" value={num(good)}>
            <div className="mt-2 h-1.5 rounded-full bg-panel-2">
              <div className={`h-full rounded-full ${vsTarget >= 0.95 ? 'bg-run' : 'bg-idle'}`} style={{ width: `${Math.min(100, vsTarget * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-dim">{pct(vsTarget)} of target so far</div>
          </Kpi>
          <Kpi icon={Gauge} label="Plant OEE" value={pct(plantOee(machines))}>
            <div className="mt-1 text-xs text-dim">Across all 7 machines</div>
          </Kpi>
          <Kpi icon={Activity} label="Machines running" value={`${running} / ${machines.length}`} tone={stopped.length ? 'text-stop' : 'text-run'}>
            <div className={`mt-1 truncate text-xs ${stopped.length ? 'text-stop' : 'text-dim'}`}>
              {stopped.length ? `${stopped.map((m) => m.id).join(', ')} stopped` : 'Nothing stopped'}
            </div>
          </Kpi>
          <Kpi icon={Zap} label="Power cost today" value={rm(kWh * rate, 0)}>
            <div className="mt-1 text-xs text-dim">{num(kW)} kW drawing now</div>
          </Kpi>
        </div>
      </div>
    </Card>
  )
}

function Kpi({ icon: Icon, label, value, tone = '', children }: { icon: LucideIcon; label: string; value: ReactNode; tone?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-panel-2/60 p-3 lg:p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-dim">
        <Icon size={14} className="text-accent" /> {label}
      </div>
      <div className={`tabular mt-1 truncate text-2xl font-bold lg:text-3xl ${tone}`}>{value}</div>
      {children}
    </div>
  )
}

function MachineStrip() {
  const machines = useStore((s) => s.machines)
  const openApp = useStore((s) => s.openApp)
  const now = useSimNow(1000)
  const share = targetShare(now)
  return (
    <div>
      <SectionLabel aside="Good parts today · vs target so far">Machines now</SectionLabel>
      {/* Swipe sideways on a phone; one row of seven on a wide screen. */}
      <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 xl:mx-0 xl:grid xl:grid-cols-7 xl:overflow-visible xl:px-0 xl:pb-0">
        {machines.map((m) => {
          const vs = m.good / Math.max(1, m.targetPerDay * share)
          return (
            <button
              key={m.id}
              onClick={() => openApp('machine-status')}
              className={`relative w-36 shrink-0 snap-start overflow-hidden rounded-xl border bg-panel p-3 text-left transition hover:border-accent/60 xl:w-auto ${
                m.status === 'stop' ? 'border-stop' : 'border-line'
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${STATUS_COLOR[m.status]}`} />
              <div className="flex items-center gap-2">
                <StatusLight status={m.status} />
                <span className="text-lg font-bold">{m.id}</span>
                <span className="tabular ml-auto text-xs font-semibold text-dim">{pct(vs)}</span>
              </div>
              <div className="truncate text-xs text-dim">{m.part}</div>
              <div className="tabular mt-1 text-2xl font-bold">{num(m.good)}</div>
              <div className={`truncate text-xs font-medium ${STATUS_TEXT[m.status]}`}>
                {m.status === 'run' ? STATUS_LABEL.run : (m.stopReason ?? STATUS_LABEL[m.status])}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
