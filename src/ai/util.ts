// Small calculations several answers share.
import { dayStart } from '../sim/seed'
import type { Machine, View } from '../sim/types'

const DAY = 86400000

/** Share of the day's target each machine should have made by now. */
export const targetShare = (now: number) => (now - dayStart(now)) / DAY

/** Good parts against target so far, 1 = on target. */
export const vsTarget = (m: Machine, now: number) => m.good / Math.max(1, m.targetPerDay * targetShare(now))

/** Good parts an hour at the current cycle, nothing when the machine is not running. */
export const partsPerHour = (m: Machine) => (m.status === 'run' ? (3600 / m.cycleS) * m.cavities * (1 - m.scrapRate) : 0)

export const why = (m: Machine) => (m.status === 'run' ? 'running' : `${m.status === 'stop' ? 'stopped' : 'idle'}${m.stopReason ? `: ${m.stopReason.toLowerCase()}` : ''}`)

export const app = (id: Extract<View, { kind: 'app' }>['app']): View => ({ kind: 'app', app: id })

/** "M1, M2 and M3" */
export function list(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`
