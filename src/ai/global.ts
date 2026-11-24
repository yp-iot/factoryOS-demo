// Questions the assistant answers on every screen.
import { TASKS } from '../areas/maintenance/maintenanceData'
import { RESIN_RM_PER_KG } from '../areas/energy/energyData'
import { committed } from '../areas/stores/whShared'
import { num, pct, rm } from '../lib/format'
import { plantOee } from '../sim/engine'
import { dayStart } from '../sim/seed'
import { onHand, SKUS } from '../sim/stock'
import type { Store } from '../sim/store'
import { warehouseTasks } from '../sim/warehouse'
import type { Answer, Intent } from './types'
import { app, list, plural, targetShare, why } from './util'

export function attention(s: Store): Answer {
  const items: { text: string; view: Answer['go'] }[] = []
  for (const b of s.breakdowns.filter((x) => x.end === null)) {
    items.push({ text: `**${b.machineId} is stopped**: ${b.alarm}. Technician ${b.technician} has been alerted.`, view: { label: 'Open Breakdown Reporting', view: app('breakdown') } })
  }
  for (const a of s.sos.filter((x) => x.cleared === null)) {
    items.push({ text: `**SOS from ${a.worker}** in ${a.zone}.`, view: { label: 'Open Worker SOS', view: app('sos') } })
  }
  for (const m of s.machines.filter((x) => x.status === 'idle')) {
    items.push({ text: `**${m.id}** is ${why(m)}.`, view: { label: 'Open Machine Status', view: app('machine-status') } })
  }
  for (const k of SKUS) {
    const free = onHand(k.id, s.materials, s.wh) - committed(k.id, s)
    if (free < k.reorder) items.push({ text: `**${k.name}** is below its reorder level (${num(free)} ${k.unit} free).`, view: { label: 'Open Inventory', view: app('inventory') } })
  }
  const urgent = warehouseTasks(s).filter((t) => t.urgent)
  if (urgent.length) items.push({ text: `**${plural(urgent.length, 'urgent warehouse task')}**: ${list(urgent.map((t) => t.ref))}.`, view: { label: 'Open Operator Station', view: app('operator-station') } })
  const done = (s.appState['pm-done'] as string[] | undefined) ?? []
  const overdue = TASKS.filter((t) => t.dueIn < 0 && !done.includes(t.id))
  if (overdue.length) items.push({ text: `**${plural(overdue.length, 'maintenance job')} overdue**: ${list(overdue.map((t) => `${t.machine} ${t.task.toLowerCase()}`))}.`, view: { label: 'Open Maintenance Schedule', view: app('pm-schedule') } })
  const waiting = s.claims.filter((c) => c.status === 'Waiting').length
  if (waiting) items.push({ text: `**${plural(waiting, 'claim')}** waiting for approval.`, view: { label: 'Open E-Claim', view: app('e-claim') } })

  if (items.length === 0) return { text: 'Nothing needs you right now. Every machine is running, stock is above reorder levels and no task is urgent.' }
  return {
    text: `${plural(items.length, 'thing')} need${items.length === 1 ? 's' : ''} attention, most important first:`,
    bullets: items.slice(0, 6).map((i) => i.text),
    go: items[0].view,
  }
}

export function plantToday(s: Store): Answer {
  const ms = s.machines
  const good = ms.reduce((a, m) => a + m.good, 0)
  const target = ms.reduce((a, m) => a + m.targetPerDay, 0) * targetShare(s.simTime)
  const running = ms.filter((m) => m.status === 'run').length
  const kWh = ms.reduce((a, m) => a + m.kWh, 0)
  return {
    text: `The plant has made **${num(good)} good parts** today, **${pct(good / target)}** of target so far. Plant OEE is **${pct(plantOee(ms))}**.`,
    bullets: [
      `${running} of ${ms.length} machines running${running < ms.length ? ` (${list(ms.filter((m) => m.status !== 'run').map((m) => `${m.id} ${why(m)}`))})` : ''}`,
      `Power so far: ${num(kWh)} kWh, about ${rm(kWh * s.ratePerKWh, 0)}`,
      `${plural(s.breakdowns.filter((b) => b.start >= dayStart(s.simTime)).length, 'breakdown')} today`,
    ],
    go: { label: 'Open Daily Production', view: app('daily-production') },
  }
}

export function losingMoney(s: Store): Answer {
  const ms = s.machines
  const idle = ms.reduce((a, m) => a + m.idleKWh, 0) * s.ratePerKWh
  const scrap = ms.reduce((a, m) => a + (m.scrap * m.partWeightG * RESIN_RM_PER_KG[m.material]) / 1000, 0)
  const downMin = ms.reduce((a, m) => a + m.stopS, 0) / 60
  const worstIdle = [...ms].sort((a, b) => b.idleKWh - a.idleKWh)[0]
  return {
    text: 'Three places money leaks today, worked out from the machine counters:',
    bullets: [
      `**${rm(idle, 0)}** of power burned while machines sat idle, most of it on ${worstIdle.id}`,
      `**${rm(scrap, 0)}** of resin in ${num(ms.reduce((a, m) => a + m.scrap, 0))} scrapped parts`,
      `**${num(downMin)} minutes** of machines stopped, which is output nobody gets back`,
    ],
    go: { label: 'Open Power Cost', view: app('power-cost') },
  }
}

export const GLOBAL: Intent[] = [
  { q: 'What needs my attention right now?', keys: ['attention', 'urgent', 'problem', 'issue', 'wrong', 'alert', 'priority', 'first'], answer: attention },
  { q: 'How is the plant doing today?', keys: ['plant', 'today', 'overall', 'summary', 'doing', 'status', 'how are we'], answer: plantToday },
  { q: 'Where are we losing money today?', keys: ['money', 'losing', 'wast', 'leak', 'cost', 'save'], answer: losingMoney },
  {
    q: 'What can you help with?',
    keys: ['help', 'what can you', 'who are you', 'how do you'],
    answer: () => ({
      text: 'I read the same live numbers as the screens: machine counters, orders, stock, people and power. Ask about what you see on this screen, or ask across the plant, such as what needs attention or where money is being lost.',
      bullets: ['Every answer is worked out from the data at the moment you ask', 'The suggested questions change with the screen you are on'],
    }),
  },
]
