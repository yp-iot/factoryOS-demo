// Stores & warehouse screens, including the four warehouse apps.
import { committed } from '../areas/stores/whShared'
import { clock, num, pct, rm } from '../lib/format'
import { dailyUsage } from '../sim/engine'
import { dayStart } from '../sim/seed'
import { binStock, onHand, RACK_LABEL, RACKS, SKUS, skuOf, WH_OPERATORS } from '../sim/stock'
import type { Store } from '../sim/store'
import type { AppId, SkuId } from '../sim/types'
import { warehouseTasks } from '../sim/warehouse'
import type { Answer, Intent } from './types'
import { app, list, plural } from './util'

const TAPE_PER_DAY = 6

function daysLeft(s: Store, sku: SkuId) {
  const use = sku === 'tape' ? TAPE_PER_DAY : (dailyUsage(s.machines)[sku] ?? 0)
  return use > 0 ? onHand(sku, s.materials, s.wh) / use : Infinity
}

function runsOutFirst(s: Store): Answer {
  const rows = SKUS.filter((k) => k.category !== 'Finished goods')
    .map((k) => ({ k, days: daysLeft(s, k.id) }))
    .sort((a, b) => a.days - b.days)
  const first = rows[0]
  return {
    text: `**${first.k.name}** runs out first, in about **${first.days.toFixed(1)} days** at today’s usage. ${first.days < 3 ? 'Order now to leave time for delivery.' : 'There is time, but keep an eye on it.'}`,
    bullets: rows.slice(1).map((r) => `${r.k.name}: ${r.days === Infinity ? 'not being used today' : `${r.days.toFixed(1)} days`}`),
    go: { label: 'Open AI Material Control', view: app('material-control') },
  }
}

function belowReorder(s: Store): Answer {
  const low = SKUS.map((k) => ({ k, free: onHand(k.id, s.materials, s.wh) - committed(k.id, s) })).filter((r) => r.free < r.k.reorder)
  return low.length
    ? { text: `${plural(low.length, 'item')} below the reorder level, after what is promised to open picks and orders:`, bullets: low.map((r) => `**${r.k.name}**: ${num(r.free)} ${r.k.unit} free, reorder at ${num(r.k.reorder)}`), go: { label: 'Open Inventory', view: app('inventory') } }
    : { text: 'Every item is above its reorder level, even after open picks and orders.' }
}

const midnight = (s: Store) => new Date(s.simTime).setHours(0, 0, 0, 0)

export const STORES: Partial<Record<AppId, Intent[]>> = {
  'material-control': [
    { q: 'When will we run out of resin?', keys: ['run out', 'resin', 'days left', 'last', 'enough'], answer: runsOutFirst },
    {
      q: 'Which material requests are waiting?',
      keys: ['request', 'waiting', 'pending', 'not issued'],
      answer: (s) => {
        const open = s.requests.filter((r) => r.issuedAt === null)
        return open.length
          ? { text: `${plural(open.length, 'request')} waiting to be issued:`, bullets: open.map((r) => `**${r.id}** ${num(r.qty)} kg ${r.material.toUpperCase()} for ${r.machineId} (${r.woId}), asked at ${clock(r.requestedAt)}`), go: { label: 'Open Operator Station', view: app('operator-station') } }
          : { text: 'Nothing waiting. Every request has been issued to the line.' }
      },
    },
    {
      q: 'How is the request quantity worked out?',
      keys: ['how', 'worked out', 'calculate', 'quantity', 'size'],
      answer: (s) => {
        const r = s.requests[0]
        return {
          text: 'From the work order, not a guess: parts still to make × part weight, plus a small allowance for scrap and purging.',
          bullets: r ? [`Example ${r.id}: ${r.working}`] : undefined,
        }
      },
    },
  ],

  grn: [
    {
      q: 'What was received today?',
      keys: ['receiv', 'today', 'delivery', 'deliveries', 'came in'],
      answer: (s) => {
        const today = s.grns.filter((g) => g.t >= midnight(s))
        return today.length
          ? { text: `${plural(today.length, 'delivery', 'deliveries')} received today:`, bullets: today.map((g) => `**${g.id}** ${g.supplier}: ${g.lines.map((l) => `${num(l.qty)} ${skuOf(l.material).unit} ${skuOf(l.material).name}`).join(', ')} (${g.by.toLowerCase()})`) }
          : { text: 'Nothing has been received yet today.' }
      },
    },
    {
      q: 'Is any lorry still on site?',
      keys: ['lorry', 'truck', 'on site', 'still here', 'gate'],
      answer: (s) => {
        const lorries = s.gate.filter((g) => g.kind === 'Lorry' && g.out === null)
        return lorries.length
          ? { text: `${plural(lorries.length, 'lorry', 'lorries')} on site:`, bullets: lorries.map((g) => `**${g.plate}** ${g.who}, in since ${clock(g.in)} (${g.purpose})`) }
          : { text: 'No lorries on site. Every lorry that came in has left.' }
      },
    },
    {
      q: 'Which supplier delivers most?',
      keys: ['supplier', 'most', 'who delivers', 'vendor'],
      answer: (s) => {
        const counts = new Map<string, number>()
        for (const g of s.grns) counts.set(g.supplier, (counts.get(g.supplier) ?? 0) + 1)
        const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
        return { text: `**${rows[0][0]}** has the most deliveries on record.`, bullets: rows.map(([n, c]) => `${n}: ${plural(c, 'delivery', 'deliveries')}`) }
      },
    },
  ],

  'ai-do': [
    {
      q: 'What does the AI read from a delivery order?',
      keys: ['read', 'what', 'fields', 'extract'],
      answer: () => ({
        text: 'From one photo of the paper delivery order it fills in the goods received note:',
        bullets: ['Supplier and DO number', 'Lorry plate', 'Each line: item and quantity', 'Then a person checks it and saves. Nothing is saved without that check.'],
      }),
    },
    {
      q: 'How many deliveries were read by AI?',
      keys: ['how many', 'ai read', 'typed', 'count'],
      answer: (s) => {
        const ai = s.grns.filter((g) => g.by === 'AI read').length
        return { text: `**${ai} of ${s.grns.length}** goods received notes on record were filled from a photo. The rest were typed in.` }
      },
    },
    {
      q: 'What happens after it is saved?',
      keys: ['after', 'saved', 'then', 'next'],
      answer: () => ({
        text: 'Stock goes up straight away and the pallets wait on the receiving dock. A put-away task appears on the Operator Station, and the Warehouse Map shows the pallets on the dock until they are scanned into a bay.',
        go: { label: 'Open Operator Station', view: app('operator-station') },
      }),
    },
  ],

  'voice-warehouse': [
    {
      q: 'How does voice picking work?',
      keys: ['how', 'work', 'voice', 'headset'],
      answer: () => ({
        text: 'The picker wears a headset. It reads out one line at a time: which bay, which item, how many. The picker answers “Done” and gets the next line, with both hands free and eyes on the shelf, not on paper.',
      }),
    },
    {
      q: 'What needs picking now?',
      keys: ['pick', 'now', 'waiting', 'next'],
      answer: (s) => {
        const picks = warehouseTasks(s).filter((t) => t.kind === 'Pick' || t.kind === 'Dispatch')
        return picks.length ? { text: `${plural(picks.length, 'pick')} waiting:`, bullets: picks.map((t) => `${t.title}: ${num(t.qty)} ${t.unit} from ${t.from}`) } : { text: 'Nothing waiting to be picked.' }
      },
    },
  ],

  'wh-dashboard': [
    {
      q: 'What should I deal with first?',
      keys: ['first', 'priority', 'urgent', 'deal with', 'attention'],
      answer: (s) => {
        const tasks = warehouseTasks(s)
        const urgent = tasks.filter((t) => t.urgent)
        const low = belowReorder(s)
        return {
          text: urgent.length ? `Start with **${urgent[0].title}**: ${urgent[0].why}.` : 'Nothing urgent in the warehouse right now.',
          bullets: [...urgent.slice(1).map((t) => `${t.title}: ${t.why}`), ...(low.bullets ?? []), `${plural(tasks.length, 'open task')} in the queue`],
          go: { label: 'Open Operator Station', view: app('operator-station') },
        }
      },
    },
    {
      q: 'How much stock do we hold?',
      keys: ['stock value', 'how much', 'worth', 'value', 'hold'],
      answer: (s) => {
        const cats = ['Raw material', 'Packaging', 'Finished goods'] as const
        const val = (c: (typeof cats)[number]) => SKUS.filter((k) => k.category === c).reduce((a, k) => a + onHand(k.id, s.materials, s.wh) * k.unitCost, 0)
        const total = cats.reduce((a, c) => a + val(c), 0)
        return { text: `**${rm(total, 0)}** of stock at cost.`, bullets: cats.map((c) => `${c}: ${rm(val(c), 0)} (${pct(val(c) / total)})`) }
      },
    },
    { q: 'Which items run out soonest?', keys: ['run out', 'soonest', 'days of cover', 'cover'], answer: runsOutFirst },
  ],

  inventory: [
    { q: 'Which items are below reorder level?', keys: ['below', 'reorder', 'low', 'short'], answer: belowReorder },
    {
      q: 'What moved in the last hour?',
      keys: ['moved', 'last hour', 'recent', 'movement', 'transactions'],
      answer: (s) => {
        const recent = s.wh.txns.filter((t) => t.t >= s.simTime - 3600000)
        return recent.length
          ? { text: `${plural(recent.length, 'movement')} in the last hour:`, bullets: recent.slice(0, 6).map((t) => `${clock(t.t)} ${t.type}: ${skuOf(t.sku).name}, ${t.qty === 0 ? 'moved' : `${t.qty > 0 ? '+' : ''}${num(t.qty)} ${skuOf(t.sku).unit}`} (${t.by})`) }
          : { text: 'Nothing has moved in the last hour.' }
      },
    },
    {
      q: 'Why was stock adjusted today?',
      keys: ['adjust', 'write-off', 'damaged', 'correction', 'variance', 'why'],
      answer: (s) => {
        const adj = s.wh.txns.filter((t) => (t.type === 'Adjust' || t.type === 'Write-off') && t.t >= midnight(s))
        return adj.length
          ? { text: `${plural(adj.length, 'correction')} today, each with who and why:`, bullets: adj.map((t) => `${clock(t.t)} ${t.type}: ${skuOf(t.sku).name} ${num(t.qty)} ${skuOf(t.sku).unit} at ${t.from}, by ${t.by} (${t.ref})`) }
          : { text: 'No corrections or write-offs today.' }
      },
    },
  ],

  'wh-map': [
    {
      q: 'Which racks are nearly full?',
      keys: ['full', 'space', 'racks', 'capacity'],
      answer: (s) => {
        const bins = binStock(s.materials, s.wh)
        const rows = RACKS.map((r) => {
          const mine = bins.filter((b) => b.rack === r && b.sku)
          return { r, f: mine.reduce((a, b) => a + b.qty / b.cap, 0) / Math.max(1, mine.length) }
        }).sort((a, b) => b.f - a.f)
        return { text: `Rack **${rows[0].r}** (${RACK_LABEL[rows[0].r].toLowerCase()}) is fullest at **${pct(rows[0].f)}**.`, bullets: rows.slice(1).map((x) => `Rack ${x.r}, ${RACK_LABEL[x.r].toLowerCase()}: ${pct(x.f)}`) }
      },
    },
    {
      q: 'Where is there free space?',
      keys: ['free', 'empty', 'where', 'room'],
      answer: (s) => {
        const empty = binStock(s.materials, s.wh).filter((b) => b.qty === 0)
        return { text: `${plural(empty.length, 'bay')} empty right now: ${list(empty.map((b) => `**${b.id}**`))}.`, bullets: ['C3, C4 and F8 are unassigned and free for any item'] }
      },
    },
    {
      q: 'Which bays need counting?',
      keys: ['count', 'counting', 'cycle', 'check'],
      answer: (s) => {
        const open = s.wh.counts.filter((c) => c.doneAt === null)
        return open.length
          ? { text: `${plural(open.length, 'count')} waiting: ${list(open.map((c) => `**${c.bin}**`))}. They are on the operator’s handheld.`, go: { label: 'Open Operator Station', view: app('operator-station') } }
          : { text: 'No counts waiting. Tap a bay on the map to ask for one.' }
      },
    },
  ],

  'operator-station': [
    {
      q: 'What should the operator do next?',
      keys: ['next', 'do next', 'operator', 'task'],
      answer: (s) => {
        const t = warehouseTasks(s)[0]
        return t ? { text: `**${t.title}**: ${t.kind === 'Count' ? 'a blind count' : `${num(t.qty)} ${t.unit}`} from ${t.from} to ${t.to}. ${t.why}.` } : { text: 'The queue is empty.' }
      },
    },
    {
      q: 'How many tasks are urgent?',
      keys: ['urgent', 'how many', 'queue'],
      answer: (s) => {
        const tasks = warehouseTasks(s)
        const urgent = tasks.filter((t) => t.urgent)
        return { text: `**${urgent.length} of ${tasks.length}** tasks are urgent.`, bullets: urgent.map((t) => `${t.title}: ${t.why}`) }
      },
    },
    {
      q: 'Who has done the most scans today?',
      keys: ['who', 'most', 'scans', 'team', 'productive'],
      answer: (s) => {
        const start = dayStart(s.simTime)
        const rows = WH_OPERATORS.map((n) => ({ n, c: s.wh.txns.filter((t) => t.by === n && t.t >= start).length })).sort((a, b) => b.c - a.c)
        return { text: `**${rows[0].n}** leads with ${plural(rows[0].c, 'scan')} today.`, bullets: rows.slice(1).map((r) => `${r.n}: ${plural(r.c, 'scan')}`) }
      },
    },
  ],
}
