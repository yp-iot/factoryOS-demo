import type { KwSample, Machine, Material, RunState, Segment } from './types'

/** Seeded PRNG (mulberry32) so a Reset always replays the same factory. */
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, (state + 0x6d2b79f5) | 0]
}

export const PARTS_PER_CARTON = 500
export const MASTERBATCH_RATIO = 0.02

const STATUS_KW: Record<RunState, number> = { run: 1, idle: 0.35, stop: 0.08 }
const STATUS_TEMP: Record<RunState, number> = { run: 52, idle: 46, stop: 32 }

/** Seconds spent in each status between `from` and `to`, read off a timeline. */
export function timeInStatus(segments: Segment[], from: number, to: number) {
  const out: Record<RunState, number> = { run: 0, stop: 0, idle: 0 }
  segments.forEach((seg, i) => {
    const end = i + 1 < segments.length ? segments[i + 1].start : to
    const a = Math.max(seg.start, from)
    const b = Math.min(end, to)
    if (b > a) out[seg.status] += (b - a) / 1000
  })
  return out
}

export function oee(m: Machine) {
  const planned = m.runS + m.stopS + m.idleS
  const parts = m.good + m.scrap
  const availability = planned > 0 ? m.runS / planned : 0
  const performance = m.runS > 0 ? Math.min(1, ((parts / m.cavities) * m.idealCycleS) / m.runS) : 0
  const quality = parts > 0 ? m.good / parts : 0
  return { availability, performance, quality, oee: availability * performance * quality }
}

export function plantOee(machines: Machine[]) {
  const vals = machines.map((m) => oee(m).oee)
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Material use per day if every machine kept doing what it is doing now. */
export function dailyUsage(machines: Machine[]): Record<string, number> {
  const out: Record<string, number> = { pp: 0, abs: 0, mb: 0, carton: 0 }
  for (const m of machines) {
    if (m.status !== 'run') continue
    const partsPerDay = (86400 / m.cycleS) * m.cavities
    const resin = (partsPerDay * m.partWeightG) / 1000
    out[m.material] += resin
    out.mb += resin * MASTERBATCH_RATIO
    out.carton += (partsPerDay * (1 - m.scrapRate)) / PARTS_PER_CARTON
  }
  return out
}

/** Advance every machine and the material balances by `dtS` sim seconds. */
export function tick(
  machines: Machine[],
  materials: Material[],
  dtS: number,
  rand: () => number,
): { machines: Machine[]; materials: Material[] } {
  const used: Record<string, number> = { pp: 0, abs: 0, mb: 0, carton: 0 }

  const next = machines.map((m) => {
    const n = { ...m }
    const noise = () => 1 + (rand() - 0.5) * 0.08

    n.kW = m.runKW * STATUS_KW[m.status] * noise()
    n.currentA = n.kW * 1.64
    const alarmHot = m.status === 'stop' && /temp/i.test(m.stopReason ?? '')
    const targetTemp = alarmHot ? 84 : STATUS_TEMP[m.status]
    n.tempC = m.tempC + (targetTemp - m.tempC) * Math.min(1, dtS / 120) + (rand() - 0.5) * 0.6

    const kWh = (n.kW * dtS) / 3600
    n.kWh = m.kWh + kWh
    if (m.status === 'idle') n.idleKWh = m.idleKWh + kWh

    if (m.status === 'run') {
      n.runS = m.runS + dtS
      n.cycleS = m.idealCycleS * (1.04 + (rand() - 0.5) * 0.04)
      const shots = m.shotAcc + dtS / n.cycleS
      const whole = Math.floor(shots)
      n.shotAcc = shots - whole
      const parts = whole * m.cavities
      let scrap = 0
      for (let i = 0; i < whole; i++) if (rand() < m.scrapRate) scrap += m.cavities
      scrap = Math.min(scrap, parts)
      n.good = m.good + parts - scrap
      n.scrap = m.scrap + scrap
      const resinKg = (parts * m.partWeightG) / 1000
      used[m.material] += resinKg
      used.mb += resinKg * MASTERBATCH_RATIO
      used.carton += (parts - scrap) / PARTS_PER_CARTON
    } else if (m.status === 'stop') {
      n.stopS = m.stopS + dtS
    } else {
      n.idleS = m.idleS + dtS
    }
    return n
  })

  // Material already issued to the floor is used first; the rest comes out of the warehouse.
  const mats = materials.map((mat) => {
    const fromLine = Math.min(mat.lineSide, used[mat.id])
    return { ...mat, lineSide: mat.lineSide - fromLine, balance: Math.max(0, mat.balance - (used[mat.id] - fromLine)) }
  })
  return { machines: next, materials: mats }
}

export const LOG_MS = 15 * 60000
export const bucketOf = (t: number) => Math.floor(t / LOG_MS) * LOG_MS

/** Append a 15-minute power reading for every bucket that `now` has moved past. */
export function logPower(machines: Machine[], now: number): Machine[] {
  const bucket = bucketOf(now)
  return machines.map((m) => {
    const last = m.kwLog[m.kwLog.length - 1]
    if (last && last.t >= bucket - LOG_MS) return m
    const fill: KwSample[] = []
    for (let t = (last ? last.t : bucket - LOG_MS) + LOG_MS; t < bucket; t += LOG_MS) {
      fill.push({ t, kW: m.kW, status: m.status })
    }
    return { ...m, kwLog: [...m.kwLog, ...fill].slice(-200) }
  })
}
