// Maintenance screens: breakdowns, preventive maintenance, spares, machine status.
import { PARTS, TASKS } from '../areas/maintenance/maintenanceData'
import { clock, duration, num } from '../lib/format'
import { dayStart } from '../sim/seed'
import type { Store } from '../sim/store'
import type { AppId } from '../sim/types'
import type { Intent } from './types'
import { app, plural, why } from './util'

const openPm = (s: Store) => {
  const done = (s.appState['pm-done'] as string[] | undefined) ?? []
  return TASKS.filter((t) => !done.includes(t.id))
}
const ordered = (s: Store) => (s.appState['spares-ordered'] as string[] | undefined) ?? []

export const MAINTENANCE: Partial<Record<AppId, Intent[]>> = {
  breakdown: [
    {
      q: 'Is any machine down right now?',
      keys: ['down', 'stopped', 'broken', 'open breakdown', 'right now'],
      answer: (s) => {
        const open = s.breakdowns.filter((b) => b.end === null)
        if (open.length === 0) return { text: 'No. Every breakdown today has been closed and all machines are back up.' }
        return {
          text: `${plural(open.length, 'machine')} down:`,
          bullets: open.map((b) => `**${b.machineId}**: ${b.alarm}, down ${duration((s.simTime - b.start) / 1000)}, ${b.technician} alerted at ${clock(b.start)}`),
          go: { label: 'Open Breakdown Reporting', view: app('breakdown') },
        }
      },
    },
    {
      q: 'How much downtime have we had today?',
      keys: ['downtime', 'how long', 'minutes', 'lost time'],
      answer: (s) => {
        const today = s.breakdowns.filter((b) => b.start >= dayStart(s.simTime))
        const mins = (b: (typeof today)[number]) => Math.round(((b.end ?? s.simTime) - b.start) / 60000)
        const total = today.reduce((a, b) => a + mins(b), 0)
        return {
          text: `**${num(total)} minutes** of breakdown downtime today, across ${plural(today.length, 'stop')}.`,
          bullets: today.map((b) => `${b.machineId} at ${clock(b.start)}: ${mins(b)} min, ${b.reason ?? b.alarm}`),
        }
      },
    },
    {
      q: 'What breaks down most often?',
      keys: ['most often', 'common', 'cause', 'reason', 'pattern', 'repeat'],
      answer: (s) => {
        const byMachine = new Map<string, number>()
        for (const b of s.breakdowns) byMachine.set(b.machineId, (byMachine.get(b.machineId) ?? 0) + 1)
        const top = [...byMachine.entries()].sort((a, b) => b[1] - a[1])
        return {
          text: `Over the recorded history, **${top[0][0]}** stops most (${plural(top[0][1], 'time')}).`,
          bullets: s.breakdowns.slice(0, 5).map((b) => `${b.machineId}: ${b.reason ?? b.alarm}`),
        }
      },
    },
  ],

  'pm-schedule': [
    {
      q: 'What maintenance is overdue?',
      keys: ['overdue', 'late', 'missed', 'behind'],
      answer: (s) => {
        const late = openPm(s).filter((t) => t.dueIn < 0)
        return late.length
          ? { text: `${plural(late.length, 'job')} overdue. Skipped maintenance is how small faults become breakdowns:`, bullets: late.map((t) => `**${t.machine}** ${t.task}, ${-t.dueIn} day${t.dueIn === -1 ? '' : 's'} late, ${t.tech}`) }
          : { text: 'Nothing is overdue. Every preventive job is on schedule.' }
      },
    },
    {
      q: 'What is due this week?',
      keys: ['this week', 'due', 'upcoming', 'next', 'coming'],
      answer: (s) => ({
        text: 'Due in the next 7 days:',
        bullets: openPm(s)
          .filter((t) => t.dueIn >= 0 && t.dueIn <= 7)
          .map((t) => `${t.dueIn === 0 ? 'Today' : `In ${t.dueIn} day${t.dueIn === 1 ? '' : 's'}`}: ${t.machine} ${t.task.toLowerCase()} (${t.tech})`),
      }),
    },
    {
      q: 'Which technician has the most jobs?',
      keys: ['technician', 'who', 'workload', 'most jobs'],
      answer: (s) => {
        const counts = new Map<string, number>()
        for (const t of openPm(s)) counts.set(t.tech, (counts.get(t.tech) ?? 0) + 1)
        const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
        return { text: `**${rows[0][0]}** has the most open jobs.`, bullets: rows.map(([t, n]) => `${t}: ${plural(n, 'job')}`) }
      },
    },
  ],

  'spare-parts': [
    {
      q: 'Which spares should I reorder?',
      keys: ['reorder', 'low', 'buy', 'order', 'running out'],
      answer: (s) => {
        const low = PARTS.filter((p) => p.stock <= p.reorder && !ordered(s).includes(p.code))
        return low.length
          ? { text: `${plural(low.length, 'spare')} at or below the reorder level and not yet ordered:`, bullets: low.map((p) => `**${p.name}** (${p.code}): ${p.stock} left, reorder at ${p.reorder}, fits ${p.fits}`), go: { label: 'Open Spare Parts', view: app('spare-parts') } }
          : { text: 'Every spare is above its reorder level, or already on order.' }
      },
    },
    {
      q: 'Do we have spares if a heater band fails?',
      keys: ['heater', 'band', 'thermocouple', 'have spare'],
      answer: () => {
        const hb = PARTS.find((p) => p.code === 'SP-HB-220')!
        const tc = PARTS.find((p) => p.code === 'SP-TC-K')!
        return { text: `Yes, but only just. **${hb.stock} heater bands** in ${hb.location}, below the reorder level of ${hb.reorder}, and ${tc.stock} thermocouples. Heater faults are a common cause of mould temperature alarms, so it is worth topping up.` }
      },
    },
    {
      q: 'Which spares fit M4?',
      keys: ['fit', 'm4', 'for machine'],
      answer: () => {
        const fits = PARTS.filter((p) => p.fits === 'All' || p.fits.includes('M4') || p.fits.includes('M1–M6'))
        return { text: `${plural(fits.length, 'spare')} fit M4:`, bullets: fits.map((p) => `${p.name}: ${p.stock} in ${p.location}`) }
      },
    },
  ],

  'machine-status': [
    {
      q: 'Which machines are not running?',
      keys: ['not running', 'stopped', 'idle', 'down'],
      answer: (s) => {
        const off = s.machines.filter((m) => m.status !== 'run')
        return off.length ? { text: `${plural(off.length, 'machine')} not running:`, bullets: off.map((m) => `**${m.id}** ${why(m)}`) } : { text: `All ${s.machines.length} machines are running.` }
      },
    },
    {
      q: 'Is any machine running hot?',
      keys: ['hot', 'temperature', 'overheat', 'heat'],
      answer: (s) => {
        const hottest = [...s.machines].sort((a, b) => b.tempC - a.tempC)[0]
        return {
          text: `The hottest is **${hottest.id} at ${hottest.tempC.toFixed(1)} °C**, ${hottest.tempC > 60 ? 'which is high, worth checking the cooling water' : 'which is normal for a running moulding machine'}.`,
          bullets: s.machines.map((m) => `${m.id}: ${m.tempC.toFixed(1)} °C`),
        }
      },
    },
    {
      q: 'How much power is each machine drawing?',
      keys: ['power', 'kw', 'drawing', 'current', 'amps'],
      answer: (s) => ({
        text: `The plant is drawing **${num(s.machines.reduce((a, m) => a + m.kW, 0))} kW** right now.`,
        bullets: [...s.machines].sort((a, b) => b.kW - a.kW).map((m) => `${m.id}: ${num(m.kW)} kW, ${num(m.currentA)} A (${why(m)})`),
        go: { label: 'Open Power Cost', view: app('power-cost') },
      }),
    },
  ],
}
