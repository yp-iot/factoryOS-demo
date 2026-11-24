// People & safety screens: claims, roster, SOS badges, gate.
import { seedRoster, WORKERS, type Cell } from '../areas/people/peopleData'
import { clock, num, shown } from '../lib/format'
import { approver } from '../sim/ops'
import type { Store } from '../sim/store'
import type { AppId } from '../sim/types'
import type { Intent } from './types'
import { app, list, plural } from './util'

const roster = (s: Store) => (s.appState['roster'] as Cell[][] | undefined) ?? seedRoster()
const todayCol = (s: Store) => (new Date(shown(s.simTime)).getDay() + 6) % 7

export const PEOPLE: Partial<Record<AppId, Intent[]>> = {
  'e-claim': [
    {
      q: 'Which claims are waiting for approval?',
      keys: ['waiting', 'pending', 'approval', 'approve'],
      answer: (s) => {
        const w = s.claims.filter((c) => c.status === 'Waiting')
        return w.length
          ? { text: `${plural(w.length, 'claim')} waiting for **${approver()}**:`, bullets: w.map((c) => `**${c.worker}**, ${c.kind.toLowerCase()}: ${c.amount} (${c.detail})`), go: { label: 'Open E-Claim', view: app('e-claim') } }
          : { text: 'Nothing waiting. Every claim has been decided.' }
      },
    },
    {
      q: 'Who approves claims today?',
      keys: ['who approves', 'approver', 'supervisor', 'leave'],
      answer: (s) => ({ text: s.supervisorOnLeave ? `**${approver()}**, because the usual supervisor is on leave. Claims go to the backup automatically, so nothing waits.` : `**${approver()}**, the shift supervisor. If they go on leave, claims switch to the backup by themselves.` }),
    },
    {
      q: 'How much overtime is claimed?',
      keys: ['overtime', 'hours', 'how much'],
      answer: (s) => {
        const ot = s.claims.filter((c) => c.kind === 'Overtime')
        const hours = ot.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0)
        return { text: `**${num(hours, 1)} hours** of overtime claimed across ${plural(ot.length, 'claim')}.`, bullets: ot.map((c) => `${c.worker}: ${c.amount}, ${c.status.toLowerCase()}`) }
      },
    },
  ],

  roster: [
    {
      q: 'Who is working today?',
      keys: ['today', 'working', 'who is working', 'shift'],
      answer: (s) => {
        const g = roster(s)
        const d = todayCol(s)
        const on = (c: Cell) => WORKERS.filter((_, w) => g[w][d] === c)
        return { text: `Today: **${on('A').length} on shift A**, **${on('B').length} on shift B**.`, bullets: [`Shift A: ${list(on('A'))}`, `Shift B: ${list(on('B'))}`, `Off or on leave: ${list([...on('Off'), ...on('Leave')]) || 'nobody'}`] }
      },
    },
    {
      q: 'Who is on leave this week?',
      keys: ['leave', 'off', 'absent', 'holiday'],
      answer: (s) => {
        const g = roster(s)
        const away = WORKERS.filter((_, w) => g[w].includes('Leave'))
        return away.length ? { text: `${list(away.map((n) => `**${n}**`))} ${away.length === 1 ? 'has' : 'have'} leave this week.` } : { text: 'Nobody has leave booked this week. Tap a cell on the roster to mark someone on leave.' }
      },
    },
    {
      q: 'Is any shift short-staffed?',
      keys: ['short', 'enough', 'staffed', 'cover'],
      answer: (s) => {
        const g = roster(s)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const short = days.flatMap((day, d) =>
          (['A', 'B'] as Cell[]).map((c) => ({ day, c, n: WORKERS.filter((_, w) => g[w][d] === c).length })).filter((x) => x.n < 6),
        )
        return short.length ? { text: 'These shifts have fewer than 6 people:', bullets: short.map((x) => `${x.day} shift ${x.c}: ${x.n}`) } : { text: 'Every shift this week has at least 6 people.' }
      },
    },
  ],

  sos: [
    {
      q: 'Is there an active SOS?',
      keys: ['active', 'sos', 'alarm', 'emergency', 'now'],
      answer: (s) => {
        const a = s.sos.find((x) => x.cleared === null)
        return a
          ? { text: `**Yes. ${a.worker}** pressed SOS in **${a.zone}** at ${clock(a.t)}. The supervisor and first aiders were alerted with the location.`, go: { label: 'Open Worker SOS', view: app('sos') } }
          : { text: `No active alarm. ${s.sos.length ? `${plural(s.sos.length, 'alert')} today, all cleared.` : 'No alerts today.'}` }
      },
    },
    {
      q: 'How fast did help arrive?',
      keys: ['fast', 'response', 'how long', 'arrive'],
      answer: (s) => {
        const done = s.sos.filter((a) => a.cleared !== null)
        return done.length
          ? { text: 'Response times today:', bullets: done.map((a) => `${a.worker} in ${a.zone}: help there in ${Math.max(1, Math.round((a.cleared! - a.t) / 60000))} min`) }
          : { text: 'No alerts have been cleared yet today. Press “Test an SOS” to see the full flow.' }
      },
    },
    {
      q: 'How do the badges work?',
      keys: ['how', 'badge', 'work', 'location'],
      answer: () => ({ text: 'Each worker wears a badge with one button. The badge reports its position every few seconds, so when someone presses it the alert names the person and the exact zone. Nobody has to explain where they are.' }),
    },
  ],

  gate: [
    {
      q: 'Who is on site now?',
      keys: ['on site', 'who', 'inside', 'now'],
      answer: (s) => {
        const here = s.gate.filter((g) => g.out === null)
        return { text: `${plural(here.length, 'party', 'parties')} on site:`, bullets: here.map((g) => `**${g.who}** (${g.kind.toLowerCase()}${g.plate ? `, ${g.plate}` : ''}), in since ${clock(g.in)}: ${g.purpose}`) }
      },
    },
    {
      q: 'Which lorries came in today?',
      keys: ['lorry', 'lorries', 'truck', 'delivery'],
      answer: (s) => {
        const l = s.gate.filter((g) => g.kind === 'Lorry')
        return l.length ? { text: `${plural(l.length, 'lorry', 'lorries')} today:`, bullets: l.map((g) => `**${g.plate}** ${g.who}: in ${clock(g.in)}${g.out ? `, out ${clock(g.out)}` : ', still on site'}`) } : { text: 'No lorries today.' }
      },
    },
    {
      q: 'How long do visitors stay?',
      keys: ['how long', 'stay', 'duration', 'visit'],
      answer: (s) => {
        const left = s.gate.filter((g) => g.out !== null)
        if (left.length === 0) return { text: 'Nobody has checked out yet today, so there is no visit time to measure.' }
        const avg = left.reduce((a, g) => a + (g.out! - g.in), 0) / left.length / 60000
        return { text: `Visits that ended today lasted **${num(avg)} minutes** on average.`, bullets: left.map((g) => `${g.who}: ${num((g.out! - g.in) / 60000)} min`) }
      },
    },
  ],
}
