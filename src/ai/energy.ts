// Energy & cost screens: job costing, scrap revenue, power cost, aircon.
import { airconState, HISTORY, jobCost, seedSales, type Sale } from '../areas/energy/energyData'
import { num, pct, rm } from '../lib/format'
import type { Store } from '../sim/store'
import type { AppId } from '../sim/types'
import type { Intent } from './types'
import { app, list, plural, why } from './util'

const costs = (s: Store) => s.workOrders.filter((o) => o.made > 0).map((o) => jobCost(o, s.machines.find((m) => m.id === o.machineId)!, s.ratePerKWh))
const sales = (s: Store) => (s.appState['scrap-sales'] as Sale[] | undefined) ?? seedSales(s.simTime)
const thisMonth = (s: Store) => {
  const d = new Date(s.simTime)
  return sales(s).filter((x) => new Date(x.t).getMonth() === d.getMonth() && new Date(x.t).getFullYear() === d.getFullYear())
}

export const ENERGY: Partial<Record<AppId, Intent[]>> = {
  'job-costing': [
    {
      q: 'Which order makes the least margin?',
      keys: ['least', 'lowest', 'worst', 'margin', 'losing'],
      answer: (s) => {
        const rows = costs(s).sort((a, b) => a.margin - b.margin)
        const w = rows[0]
        const parts = [
          ['material', w.material],
          ['machine time', w.machine],
          ['power', w.energy],
        ] as const
        const big = [...parts].sort((a, b) => b[1] - a[1])[0]
        return {
          text: `**${w.o.id}** (${w.o.part}) has the thinnest margin at **${pct(w.margin)}**. Its biggest cost is ${big[0]}, ${rm(big[1], 0)} so far.`,
          bullets: rows.slice(1, 3).map((r) => `${r.o.id} ${r.o.part}: ${pct(r.margin)}`),
        }
      },
    },
    {
      q: 'Which order is most profitable?',
      keys: ['most', 'best', 'profit', 'highest', 'earn'],
      answer: (s) => {
        const rows = costs(s).sort((a, b) => b.revenue - b.cost - (a.revenue - a.cost))
        const b = rows[0]
        return { text: `**${b.o.id}** (${b.o.part}) has earned the most so far: **${rm(b.revenue - b.cost, 0)}** over cost, a ${pct(b.margin)} margin.` }
      },
    },
    {
      q: 'What goes into the cost of a part?',
      keys: ['what goes', 'cost made', 'how', 'calculate', 'include'],
      answer: () => ({
        text: 'Each order is costed from the machine’s own counters, not estimates:',
        bullets: ['Material: parts made, plus scrap, × part weight × resin price', 'Machine time: hours on the machine × the hourly rate for labour and overheads', 'Power: hours × the machine’s kW × the electricity rate'],
      }),
    },
  ],

  'scrap-revenue': [
    {
      q: 'How much have we earned from scrap this month?',
      keys: ['earned', 'this month', 'revenue', 'sold', 'how much'],
      answer: (s) => {
        const m = thisMonth(s)
        const total = m.reduce((a, x) => a + x.kg * x.rmPerKg, 0)
        return {
          text: `**${rm(total, 0)}** from ${plural(m.length, 'sale')} this month (${num(m.reduce((a, x) => a + x.kg, 0))} kg).`,
          bullets: m.map((x) => `${x.type}: ${num(x.kg)} kg at ${rm(x.rmPerKg)} per kg`),
        }
      },
    },
    {
      q: 'How does this month compare?',
      keys: ['compare', 'average', 'last month', 'trend'],
      answer: (s) => {
        const total = thisMonth(s).reduce((a, x) => a + x.kg * x.rmPerKg, 0)
        const avg = HISTORY.reduce((a, b) => a + b, 0) / HISTORY.length
        return { text: `This month so far is **${rm(total, 0)}** against a monthly average of **${rm(avg, 0)}** over the last ${HISTORY.length} months. The month is not over yet.` }
      },
    },
    {
      q: 'How much scrap did we make today?',
      keys: ['today', 'scrap made', 'how much scrap', 'kg'],
      answer: (s) => {
        const rows = s.machines.map((m) => ({ m, kg: (m.scrap * m.partWeightG) / 1000 })).sort((a, b) => b.kg - a.kg)
        return { text: `**${num(rows.reduce((a, r) => a + r.kg, 0), 1)} kg** of scrap parts today, most from ${rows[0].m.id}. It is reground and sold, not thrown away.`, bullets: rows.slice(0, 3).map((r) => `${r.m.id}: ${num(r.kg, 1)} kg`) }
      },
    },
  ],

  'power-cost': [
    {
      q: 'Which machine costs the most to run today?',
      keys: ['most', 'costs', 'expensive', 'which machine'],
      answer: (s) => {
        const rows = [...s.machines].sort((a, b) => b.kWh - a.kWh)
        return { text: `**${rows[0].id}** has cost the most today: **${rm(rows[0].kWh * s.ratePerKWh, 0)}** (${num(rows[0].kWh)} kWh).`, bullets: rows.slice(1, 4).map((m) => `${m.id}: ${rm(m.kWh * s.ratePerKWh, 0)}`) }
      },
    },
    {
      q: 'How much is wasted on idle machines?',
      keys: ['idle', 'wast', 'standby', 'power', 'switched on'],
      answer: (s) => {
        const rows = [...s.machines].filter((m) => m.idleKWh > 0).sort((a, b) => b.idleKWh - a.idleKWh)
        const total = rows.reduce((a, m) => a + m.idleKWh, 0)
        return {
          text: `**${rm(total * s.ratePerKWh, 0)}** of power today went to machines that were on but not making parts.`,
          bullets: rows.slice(0, 4).map((m) => `${m.id}: ${rm(m.idleKWh * s.ratePerKWh)} idle${m.status === 'idle' ? ', still idle now' : ''}`),
          go: { label: 'Open Power Cost', view: app('power-cost') },
        }
      },
    },
    {
      q: 'What would switching off idle machines save?',
      keys: ['switch off', 'save', 'saving', 'turn off'],
      answer: (s) => {
        const idle = s.machines.filter((m) => m.status === 'idle')
        if (idle.length === 0) return { text: 'No machine is idle right now, so there is nothing to switch off.' }
        const kW = idle.reduce((a, m) => a + m.kW, 0)
        return { text: `${list(idle.map((m) => `**${m.id}**`))} ${idle.length === 1 ? 'is' : 'are'} idle and drawing **${num(kW, 1)} kW**. Switching off saves about **${rm(kW * s.ratePerKWh)} an hour**.`, bullets: idle.map((m) => `${m.id}: ${why(m)}`) }
      },
    },
  ],

  aircon: [
    {
      q: 'How much is the aircon saving?',
      keys: ['saving', 'save', 'how much'],
      answer: (s) => {
        const on = !!s.appState['aircon-saving']
        const est = airconState(s.simTime, true)
        return on
          ? { text: `Saving mode is on. At today’s occupancy it saves about **${num(est.diff)} kWh a day**, around **${rm(est.diff * s.ratePerKWh, 0)}**.` }
          : { text: `Saving mode is off. Turned on now, it would save about **${num(est.diff)} kWh a day**, around **${rm(est.diff * s.ratePerKWh, 0)}**, by switching off empty rooms and raising the setpoint to 25 °C.`, go: { label: 'Open Aircon', view: app('aircon') } }
      },
    },
    {
      q: 'Which rooms are empty right now?',
      keys: ['empty', 'rooms', 'nobody', 'occupied', 'people'],
      answer: (s) => {
        const zones = airconState(s.simTime, true).zones.filter((z) => !z.always)
        const empty = zones.filter((z) => z.people === 0)
        return { text: empty.length ? `${list(empty.map((z) => `**${z.name}**`))} ${empty.length === 1 ? 'is' : 'are'} empty.` : 'Every room has people in it right now.', bullets: zones.map((z) => `${z.name}: ${plural(z.people, 'person', 'people')}`) }
      },
    },
    {
      q: 'How does it know who is in a room?',
      keys: ['how', 'know', 'sensor', 'work'],
      answer: () => ({ text: 'A presence sensor in each room counts people. When a room empties, its aircon switches off after a short delay, and occupied rooms hold 25 °C instead of 23 °C. The server room is never switched off.' }),
    },
  ],
}
