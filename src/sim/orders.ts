import { num } from '../lib/format'
import { MASTERBATCH_RATIO } from './engine'
import type { Machine, MachineId, WorkOrder, WorkOrderStatus } from './types'

export const QC_MINUTES = 20

export function statusOf(wo: WorkOrder): WorkOrderStatus {
  if (wo.doneAt !== null) return 'done'
  if (wo.qcAt !== null) return 'qc'
  if (wo.startedAt !== null) return 'running'
  return 'released'
}

/**
 * Good parts each machine made this tick go to that machine's running order.
 * A machine with no running order picks up its oldest released one; a full
 * order moves to QC, and QC passes after QC_MINUTES.
 */
export function progressOrders(
  orders: WorkOrder[],
  made: Partial<Record<MachineId, number>>,
  machines: Machine[],
  now: number,
): WorkOrder[] {
  const next = orders.map((o) => ({ ...o }))
  for (const m of machines) {
    let running = next.find((o) => o.machineId === m.id && statusOf(o) === 'running')
    if (!running && m.status === 'run') {
      running = next
        .filter((o) => o.machineId === m.id && statusOf(o) === 'released')
        .sort((a, b) => a.created - b.created)[0]
      if (running) running.startedAt = now
    }
    const add = made[m.id] ?? 0
    if (running && add > 0) {
      running.made = Math.min(running.qty, running.made + add)
      if (running.made >= running.qty) running.qcAt = now
    }
  }
  for (const o of next) {
    if (statusOf(o) === 'qc' && now - o.qcAt! >= QC_MINUTES * 60000) o.doneAt = now
  }
  return next
}

/** How much resin a work order still needs, with the working shown. */
export function suggestMaterial(wo: WorkOrder, m: Machine) {
  const left = Math.max(0, wo.qty - wo.made)
  const allowance = 1 + m.scrapRate + 0.02 // scrap plus purging and start-up
  const resinKg = Math.ceil((left * m.partWeightG * allowance) / 1000)
  const mbKg = Math.ceil(resinKg * MASTERBATCH_RATIO)
  const working = `${num(left)} parts left × ${m.partWeightG} g × ${allowance.toFixed(2)} (scrap and start-up allowance) = ${num(resinKg)} kg`
  return { left, resinKg, mbKg, working }
}
