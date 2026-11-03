import { bucketOf, LOG_MS, timeInStatus } from './engine'
import type { Breakdown, KwSample, Machine, MachineId, Material, MaterialRequest, PhoneMessage, RunState, Segment, WorkOrder } from './types'

/** The story always opens at 09:30, 2.5 hours into shift A. The screen shows it at the real time (lib/format shown). */
export function startTime() {
  const d = new Date()
  d.setHours(9, 30, 0, 0)
  return d.getTime()
}

export function dayStart(t: number) {
  const d = new Date(t)
  d.setHours(7, 0, 0, 0)
  if (d.getTime() > t) d.setDate(d.getDate() - 1)
  return d.getTime()
}

const at = (base: number, hh: number, mm: number) => {
  const d = new Date(base)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

interface Spec {
  id: MachineId
  kind: Machine['kind']
  part: string
  material: Machine['material']
  partWeightG: number
  cavities: number
  idealCycleS: number
  scrapRate: number
  runKW: number
  // status changes before 09:30, as [hh, mm, status]
  history: [number, number, RunState][]
  stopReason?: string
}

const SPECS: Spec[] = [
  { id: 'M1', kind: 'injection', part: 'Bottle cap 28 mm', material: 'pp', partWeightG: 3.2, cavities: 16, idealCycleS: 9, scrapRate: 0.012, runKW: 18, history: [[7, 0, 'run']] },
  { id: 'M2', kind: 'injection', part: 'Food container lid', material: 'pp', partWeightG: 14, cavities: 4, idealCycleS: 14, scrapRate: 0.018, runKW: 22, history: [[7, 0, 'run'], [8, 50, 'idle'], [9, 2, 'run']] },
  { id: 'M3', kind: 'injection', part: 'Switch box housing', material: 'abs', partWeightG: 48, cavities: 2, idealCycleS: 28, scrapRate: 0.02, runKW: 26, history: [[7, 0, 'run']] },
  { id: 'M4', kind: 'injection', part: 'Plant pot 6 inch', material: 'pp', partWeightG: 62, cavities: 1, idealCycleS: 22, scrapRate: 0.015, runKW: 24, history: [[7, 0, 'run'], [8, 15, 'stop'], [8, 24, 'run']] },
  { id: 'M5', kind: 'injection', part: 'Wall switch cover', material: 'abs', partWeightG: 9, cavities: 8, idealCycleS: 18, scrapRate: 0.025, runKW: 20, history: [[7, 0, 'run'], [9, 12, 'stop'], [9, 18, 'run']] },
  { id: 'M6', kind: 'injection', part: 'Storage box 20 L', material: 'pp', partWeightG: 380, cavities: 1, idealCycleS: 45, scrapRate: 0.01, runKW: 30, history: [[7, 0, 'run'], [9, 5, 'idle']], stopReason: 'Mould change' },
  { id: 'P1', kind: 'press', part: 'Handle insert press-fit', material: 'pp', partWeightG: 0, cavities: 1, idealCycleS: 6, scrapRate: 0.008, runKW: 32, history: [[7, 0, 'run'], [8, 0, 'idle'], [8, 20, 'run']] },
]

function buildMachine(s: Spec, now: number): Machine {
  const segments = s.history.map(([hh, mm, status]) => ({ start: at(now, hh, mm), status }))
  const t = timeInStatus(segments, dayStart(now), now)
  const shots = Math.floor(t.run / (s.idealCycleS * 1.04))
  const parts = shots * s.cavities
  const scrap = Math.round(parts * s.scrapRate)
  const status = segments[segments.length - 1].status
  const kWh = (s.runKW * t.run + s.runKW * 0.35 * t.idle + s.runKW * 0.08 * t.stop) / 3600
  const kW = s.runKW * (status === 'run' ? 1 : status === 'idle' ? 0.35 : 0.08)
  return {
    id: s.id,
    kind: s.kind,
    part: s.part,
    material: s.material,
    partWeightG: s.partWeightG,
    cavities: s.cavities,
    idealCycleS: s.idealCycleS,
    cycleS: s.idealCycleS * 1.04,
    targetPerDay: Math.round(((86400 / s.idealCycleS) * s.cavities * 0.85) / 100) * 100,
    scrapRate: s.scrapRate,
    runKW: s.runKW,
    status,
    stopReason: status === 'run' ? null : (s.stopReason ?? null),
    shotAcc: 0,
    good: parts - scrap,
    scrap,
    runS: t.run,
    stopS: t.stop,
    idleS: t.idle,
    kWh,
    idleKWh: (s.runKW * 0.35 * t.idle) / 3600,
    kW,
    currentA: kW * 1.64,
    tempC: status === 'run' ? 52 : 46,
    segments,
    kwLog: seedKwLog(s, segments, now),
  }
}

// Status before 07:00 today, which the segments don't cover. Hours count from yesterday 00:00.
const EARLIER_IDLE: [MachineId, number, number, number, number, RunState][] = [
  ['P1', 19, 0, 23, 30, 'idle'], // left powered after the day shift
  ['M6', 13, 0, 14, 0, 'idle'],
  ['M2', 15, 40, 16, 22, 'stop'], // BD-0416
  ['M3', 23, 0, 23, 45, 'idle'],
  ['M4', 27, 0, 28, 0, 'idle'], // 03:00–04:00 today
]

/** 24 hours of 15-minute power readings, so the chart has history from the first second. */
function seedKwLog(s: Spec, segments: Segment[], now: number): KwSample[] {
  const yesterday = now - 86400000
  const earlier = EARLIER_IDLE.filter((e) => e[0] === s.id).map(([, h1, m1, h2, m2, status]) => ({
    from: at(yesterday, 0, 0) + (h1 * 60 + m1) * 60000,
    to: at(yesterday, 0, 0) + (h2 * 60 + m2) * 60000,
    status,
  }))
  const factor = { run: 1, idle: 0.35, stop: 0.08 }
  const out: KwSample[] = []
  for (let t = bucketOf(now) - 96 * LOG_MS; t < bucketOf(now); t += LOG_MS) {
    let status: RunState = 'run'
    if (t >= segments[0].start) status = [...segments].reverse().find((seg) => seg.start <= t)!.status
    else status = earlier.find((e) => t >= e.from && t < e.to)?.status ?? 'run'
    const wobble = 1 + Math.sin(t / 3.7e6 + s.runKW) * 0.04
    out.push({ t, kW: s.runKW * factor[status] * wobble, status })
  }
  return out
}

export function seedMachines(now: number) {
  return SPECS.map((s) => buildMachine(s, now))
}

export function seedMaterials(): Material[] {
  return [
    { id: 'pp', name: 'PP resin', unit: 'kg', balance: 2400, reorderLevel: 2000, lineSide: 0 },
    { id: 'abs', name: 'ABS resin', unit: 'kg', balance: 3200, reorderLevel: 1000, lineSide: 0 },
    { id: 'mb', name: 'Masterbatch', unit: 'kg', balance: 180, reorderLevel: 100, lineSide: 0 },
    { id: 'carton', name: 'Cartons', unit: 'pcs', balance: 1600, reorderLevel: 800, lineSide: 0 },
  ]
}

const PRICE: Record<MachineId, number> = { M1: 0.03, M2: 0.12, M3: 1.1, M4: 0.85, M5: 0.25, M6: 9.5, P1: 0.4 }

/**
 * Today's open orders start at 07:00, so `made` equals what each machine has
 * made today. P1 finished its order at 09:20 and is free for a new one.
 */
export function seedWorkOrders(now: number, machines: Machine[]): WorkOrder[] {
  const day = 86400000
  const good = (id: MachineId) => machines.find((m) => m.id === id)!.good
  const part = (id: MachineId) => machines.find((m) => m.id === id)!.part
  const wo = (n: number, id: MachineId, qty: number, dueDays: number, extra: Partial<WorkOrder> = {}): WorkOrder => ({
    id: `WO-${n}`,
    part: part(id),
    machineId: id,
    qty,
    made: 0,
    pricePerPart: PRICE[id],
    created: at(now - day, 16, 0),
    due: at(now + dueDays * day, 17, 0),
    startedAt: null,
    qcAt: null,
    doneAt: null,
    ...extra,
  })
  const today7 = at(now, 7, 0)
  return [
    wo(1098, 'M3', 3000, -1, { made: 3000, created: at(now - 3 * day, 9, 0), startedAt: at(now - 2 * day, 8, 0), qcAt: at(now - day, 18, 40), doneAt: at(now - day, 19, 0) }),
    wo(1100, 'P1', 1200, 0, { made: 1200, created: at(now - day, 11, 0), startedAt: at(now, 7, 5), qcAt: at(now, 9, 20) }),
    wo(1101, 'M1', 150000, 3, { made: good('M1'), startedAt: today7 }),
    wo(1102, 'M2', 12000, 1, { made: good('M2'), startedAt: today7 }),
    wo(1103, 'M3', 2400, 2, { made: good('M3'), startedAt: today7 }),
    wo(1104, 'M4', 1500, 1, { made: good('M4'), startedAt: today7 }),
    wo(1105, 'M5', 8000, 2, { made: good('M5'), startedAt: today7 }),
    wo(1106, 'M6', 600, 4),
    wo(1107, 'M1', 100000, 6, { created: at(now, 8, 30) }),
  ]
}

export function seedRequests(now: number): MaterialRequest[] {
  return [
    { id: 'MR-0302', woId: 'WO-1104', machineId: 'M4', material: 'pp', qty: 90, working: '1,400 parts left × 62 g × 1.04 = 90 kg', requestedAt: at(now, 9, 10), issuedAt: null },
    { id: 'MR-0301', woId: 'WO-1102', machineId: 'M2', material: 'pp', qty: 160, working: '10,800 parts left × 14 g × 1.04 = 160 kg', requestedAt: at(now, 7, 20), issuedAt: at(now, 7, 45) },
  ]
}

export const TECHNICIANS = ['Ali', 'Kumar', 'Hafiz']

export function seedBreakdowns(now: number): Breakdown[] {
  const day = 86400000
  return [
    { id: 'BD-0418', machineId: 'M5', start: at(now, 9, 12), end: at(now, 9, 18), alarm: 'Material jam at hopper', reason: 'Material jam', technician: 'Kumar' },
    { id: 'BD-0417', machineId: 'M4', start: at(now, 8, 15), end: at(now, 8, 24), alarm: 'Ejector fault', reason: 'Ejector pin stuck', technician: 'Hafiz' },
    { id: 'BD-0416', machineId: 'M2', start: at(now - day, 15, 40), end: at(now - day, 16, 22), alarm: 'Low oil pressure', reason: 'Hydraulic leak', technician: 'Ali' },
    { id: 'BD-0415', machineId: 'M4', start: at(now - 2 * day, 10, 5), end: at(now - 2 * day, 10, 30), alarm: 'Barrel zone 3 low temp', reason: 'Heater band failed', technician: 'Kumar' },
    { id: 'BD-0414', machineId: 'M1', start: at(now - 3 * day, 21, 10), end: at(now - 3 * day, 21, 22), alarm: 'Safety gate open', reason: 'Electrical', technician: 'Hafiz' },
  ]
}

export function seedMessages(now: number): PhoneMessage[] {
  return [
    { id: 'msg-seed-1', t: at(now, 7, 0), to: 'Owner', title: 'Shift A started', body: '7 machines planned for today. All started on time.', tone: 'info' },
  ]
}

