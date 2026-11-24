// Production screens: daily report, work orders, shift handover, OEE.
import { TASKS } from '../areas/maintenance/maintenanceData'
import { clock, dateTime, duration, num, pct } from '../lib/format'
import { dailyUsage, oee, plantOee } from '../sim/engine'
import { statusOf } from '../sim/orders'
import { dayStart } from '../sim/seed'
import type { Store } from '../sim/store'
import type { AppId } from '../sim/types'
import type { Intent } from './types'
import { app, list, partsPerHour, plural, targetShare, vsTarget, why } from './util'

const DAY = 86400000

/** When an order will finish at the machine's current speed, or null if it is not moving. */
function finishAt(s: Store, woId: string) {
  const o = s.workOrders.find((x) => x.id === woId)!
  const rate = partsPerHour(s.machines.find((m) => m.id === o.machineId)!)
  return rate > 0 ? s.simTime + ((o.qty - o.made) / rate) * 3600000 : null
}

export const PRODUCTION: Partial<Record<AppId, Intent[]>> = {
  'daily-production': [
    {
      q: 'Which machine is furthest behind target?',
      keys: ['behind', 'worst', 'lowest', 'furthest', 'slow', 'target'],
      answer: (s) => {
        const ranked = [...s.machines].sort((a, b) => vsTarget(a, s.simTime) - vsTarget(b, s.simTime))
        const m = ranked[0]
        const target = Math.round(m.targetPerDay * targetShare(s.simTime))
        return {
          text: `**${m.id}** (${m.part}) is furthest behind at **${pct(vsTarget(m, s.simTime))}** of target so far: ${num(m.good)} good parts against ${num(target)}. It is ${why(m)}.`,
          bullets: ranked.slice(1, 3).map((x) => `${x.id} next at ${pct(vsTarget(x, s.simTime))}, ${why(x)}`),
          go: { label: 'Open Machine Status', view: app('machine-status') },
        }
      },
    },
    {
      q: 'Will we hit today’s target?',
      keys: ['hit', 'make it', 'end of day', 'forecast', 'projection', 'will we'],
      answer: (s) => {
        const elapsed = s.simTime - dayStart(s.simTime)
        const rows = s.machines.map((m) => ({ m, projected: (m.good / Math.max(1, elapsed)) * DAY }))
        const short = rows.filter((r) => r.projected < r.m.targetPerDay)
        const good = rows.reduce((a, r) => a + r.projected, 0)
        const target = s.machines.reduce((a, m) => a + m.targetPerDay, 0)
        return {
          text: `At today’s pace the plant ends the day on about **${num(good)} parts**, **${pct(good / target)}** of the daily target.${short.length ? ` ${list(short.map((r) => r.m.id))} would fall short:` : ' Every machine is on course.'}`,
          bullets: short.map((r) => `${r.m.id}: about ${num(r.projected)} of ${num(r.m.targetPerDay)} (${pct(r.projected / r.m.targetPerDay)})`),
        }
      },
    },
    {
      q: 'Which machine is doing best?',
      keys: ['best', 'top', 'highest', 'ahead'],
      answer: (s) => {
        const ranked = [...s.machines].sort((a, b) => vsTarget(b, s.simTime) - vsTarget(a, s.simTime))
        return {
          text: `**${ranked[0].id}** leads at **${pct(vsTarget(ranked[0], s.simTime))}** of target so far, with ${num(ranked[0].good)} good ${ranked[0].part.toLowerCase()} parts.`,
          bullets: ranked.slice(1, 3).map((m) => `${m.id}: ${pct(vsTarget(m, s.simTime))}`),
        }
      },
    },
  ],

  'work-orders': [
    {
      q: 'Which orders might miss their due date?',
      keys: ['late', 'miss', 'due', 'risk', 'deadline', 'delay'],
      answer: (s) => {
        const running = s.workOrders.filter((o) => statusOf(o) === 'running')
        const risky = running.filter((o) => {
          const f = finishAt(s, o.id)
          return f === null || f > o.due
        })
        if (risky.length === 0) return { text: `All ${plural(running.length, 'running order')} finish before their due date at today’s machine speeds.` }
        return {
          text: `${plural(risky.length, 'order')} won’t make it at the current pace:`,
          bullets: risky.map((o) => {
            const f = finishAt(s, o.id)
            return `**${o.id}** on ${o.machineId}: ${num(o.qty - o.made)} left, due ${dateTime(o.due)}, ${f ? `finishes about ${dateTime(f)}` : 'machine not running'}`
          }),
          go: { label: 'Open Work Orders', view: app('work-orders') },
        }
      },
    },
    {
      q: 'What is running on each machine?',
      keys: ['running', 'each machine', 'progress', 'what is on'],
      answer: (s) => ({
        text: 'Orders in progress now:',
        bullets: s.workOrders
          .filter((o) => statusOf(o) === 'running')
          .map((o) => `**${o.machineId}** ${o.id}, ${o.part}: ${pct(o.made / o.qty)} done (${num(o.made)} of ${num(o.qty)})`),
      }),
    },
    {
      q: 'Which machine is free for a new order?',
      keys: ['free', 'available', 'new order', 'spare capacity', 'idle machine'],
      answer: (s) => {
        const busy = new Set(s.workOrders.filter((o) => statusOf(o) === 'running').map((o) => o.machineId))
        const free = s.machines.filter((m) => !busy.has(m.id))
        return free.length
          ? { text: `${list(free.map((m) => `**${m.id}**`))} ${free.length === 1 ? 'has' : 'have'} no running order and can take a new one.`, go: { label: 'Open Work Orders', view: app('work-orders') } }
          : { text: 'Every machine has a running order. The next free slot is the order closest to done.' }
      },
    },
  ],

  'shift-handover': [
    {
      q: 'Summarise this shift so far',
      keys: ['summary', 'summarise', 'summarize', 'shift so far', 'recap'],
      answer: (s) => {
        const start = dayStart(s.simTime)
        const bds = s.breakdowns.filter((b) => b.start >= start)
        const down = bds.reduce((a, b) => a + ((b.end ?? s.simTime) - b.start), 0)
        return {
          text: `Since 07:00 the plant made **${num(s.machines.reduce((a, m) => a + m.good, 0))} good parts** at **${pct(plantOee(s.machines))} OEE**.`,
          bullets: [
            `${plural(bds.length, 'breakdown')}, ${duration(down / 1000)} of downtime in total`,
            `Not running now: ${list(s.machines.filter((m) => m.status !== 'run').map((m) => `${m.id} (${why(m)})`)) || 'none'}`,
            `${plural(s.workOrders.filter((o) => o.doneAt !== null && o.doneAt >= start).length, 'order')} finished this shift`,
          ],
        }
      },
    },
    {
      q: 'What should the next shift watch out for?',
      keys: ['next shift', 'watch', 'handover', 'risk', 'warn'],
      answer: (s) => {
        const use = dailyUsage(s.machines)
        const items = [
          ...s.machines.filter((m) => m.status !== 'run').map((m) => `${m.id} is ${why(m)}`),
          ...s.materials.filter((m) => use[m.id] > 0 && m.balance / use[m.id] < 2).map((m) => `${m.name} lasts about ${(m.balance / use[m.id]).toFixed(1)} days at this rate`),
          ...TASKS.filter((t) => t.dueIn <= 0).map((t) => `${t.machine}: ${t.task.toLowerCase()} is ${t.dueIn < 0 ? 'overdue' : 'due today'}`),
        ]
        return items.length ? { text: 'For the next shift:', bullets: items.slice(0, 6) } : { text: 'Nothing unusual to hand over. All machines are running and stock is healthy.' }
      },
    },
    {
      q: 'Has the handover been acknowledged?',
      keys: ['acknowledge', 'signed', 'read', 'received'],
      answer: (s) =>
        s.handover.ackBy
          ? { text: `Yes. **${s.handover.ackBy}** acknowledged it at ${clock(s.handover.ackAt!)}.` }
          : { text: 'Not yet. Once the incoming supervisor taps Acknowledge, the time and name are recorded here.' },
    },
  ],

  oee: [
    {
      q: 'Which machine has the lowest OEE, and why?',
      keys: ['lowest', 'worst', 'why', 'oee'],
      answer: (s) => {
        const ranked = [...s.machines].sort((a, b) => oee(a).oee - oee(b).oee)
        const m = ranked[0]
        const o = oee(m)
        const parts = [
          ['availability', o.availability],
          ['performance', o.performance],
          ['quality', o.quality],
        ] as const
        const weak = [...parts].sort((a, b) => a[1] - b[1])[0]
        return {
          text: `**${m.id}** is lowest at **${pct(o.oee)}**. The weak part is **${weak[0]}** at ${pct(weak[1])}${weak[0] === 'availability' ? `, because it has spent time ${m.status === 'run' ? 'stopped or idle earlier today' : why(m)}` : weak[0] === 'performance' ? ', so it is cycling slower than its ideal time' : ', so too many parts are scrapped'}.`,
          bullets: parts.map(([label, v]) => `${label[0].toUpperCase()}${label.slice(1)} ${pct(v)}`),
        }
      },
    },
    {
      q: 'What drags plant OEE down most?',
      keys: ['drag', 'down', 'plant oee', 'improve', 'biggest loss'],
      answer: (s) => {
        const avg = (k: 'availability' | 'performance' | 'quality') => s.machines.reduce((a, m) => a + oee(m)[k], 0) / s.machines.length
        const rows = [
          ['Availability (time running)', avg('availability')],
          ['Performance (speed)', avg('performance')],
          ['Quality (good parts)', avg('quality')],
        ] as const
        const weak = [...rows].sort((a, b) => a[1] - b[1])[0]
        return { text: `Across the plant, **${weak[0].toLowerCase()}** is the biggest loss at ${pct(weak[1])}. Fixing stops and idle time usually pays back first.`, bullets: rows.map(([l, v]) => `${l}: ${pct(v)}`) }
      },
    },
    {
      q: 'What does OEE mean?',
      keys: ['what is oee', 'mean', 'explain', 'definition'],
      answer: () => ({
        text: '**OEE** shows how much of a machine’s planned time turns into good parts. It multiplies three things:',
        bullets: ['Availability: time running ÷ time planned', 'Performance: parts made ÷ parts possible at the ideal cycle time', 'Quality: good parts ÷ all parts', 'Around 85% is world class for moulding'],
      }),
    },
  ],
}
