// Demo data and costing for the energy and cost screens, shared with the assistant.
import type { Machine, WorkOrder } from '../../sim/types'

export const ZONES = [
  { name: 'Office', kW: 4.5, base: 8, phase: 0 },
  { name: 'QC room', kW: 2.5, base: 2, phase: 1.3 },
  { name: 'Meeting room', kW: 3.5, base: 0, phase: 2.1 },
  { name: 'Canteen', kW: 5, base: 0, phase: 3.4 },
  { name: 'Store office', kW: 2, base: 1, phase: 4.2 },
  { name: 'Server room', kW: 1.5, base: 0, phase: 0, always: true },
]

/** People in a zone, drifting through the day; a few rooms empty out. */
export function occupancy(base: number, phase: number, t: number) {
  const wave = Math.sin(t / 1.9e6 + phase)
  return Math.max(0, Math.round(base + wave * 3))
}

/** Which rooms are cooled, and the daily estimate the Aircon screen shows. */
export function airconState(now: number, saving: boolean) {
  const zones = ZONES.map((z) => {
    const people = z.always ? 0 : occupancy(z.base, z.phase, now)
    const on = z.always || !saving || people > 0
    const setpoint = saving && !z.always ? 25 : 23
    return { ...z, people, on, setpoint }
  })
  // Estimate for a 10-hour working day: empty rooms off, and roughly 6% less per degree raised.
  const normalKWh = ZONES.reduce((a, z) => a + z.kW * 10, 0)
  const savingKWh = zones.reduce((a, z) => a + (z.on ? z.kW * 10 * (z.always ? 1 : 0.88) : z.kW * 10 * 0.35), 0)
  return { zones, normalKWh, savingKWh, diff: normalKWh - savingKWh }
}

export interface Sale {
  id: number
  t: number
  type: string
  kg: number
  rmPerKg: number
}

export const TYPES = { 'PP regrind': 1.8, 'ABS regrind': 2.6, 'Mixed lumps': 0.9 } as Record<string, number>
// Past 11 months of scrap sold, RM.
export const HISTORY = [1840, 2120, 1960, 2310, 2050, 1780, 2240, 2400, 2190, 2060, 2280]

/** Opening scrap sales, before anyone records one in the demo. */
export const seedSales = (now: number): Sale[] => [
  { id: 3, t: now - 2 * 86400000, type: 'PP regrind', kg: 420, rmPerKg: 1.8 },
  { id: 2, t: now - 9 * 86400000, type: 'ABS regrind', kg: 180, rmPerKg: 2.6 },
  { id: 1, t: now - 15 * 86400000, type: 'Mixed lumps', kg: 260, rmPerKg: 0.9 },
]

// Demo assumptions, shown on screen.
export const RESIN_RM_PER_KG = { pp: 6.2, abs: 9.8 }
export const MACHINE_RM_PER_HOUR = 28 // labour, depreciation and overheads per machine hour

/** What an order has cost so far, and what it has earned. */
export function jobCost(o: WorkOrder, m: Machine, rate: number) {
  const hours = ((o.made / (1 - m.scrapRate) / m.cavities) * m.idealCycleS * 1.04) / 3600
  const material = ((o.made / (1 - m.scrapRate)) * m.partWeightG * RESIN_RM_PER_KG[m.material]) / 1000
  const machine = hours * MACHINE_RM_PER_HOUR
  const energy = hours * m.runKW * rate
  const cost = material + machine + energy
  const revenue = o.made * o.pricePerPart
  return { o, hours, material, machine, energy, cost, revenue, margin: revenue > 0 ? (revenue - cost) / revenue : 0 }
}
