// Actions for the quality, stores and people apps. Kept out of store.ts,
// which stays about machines, orders and the clock.
import { num } from '../lib/format'
import { BACKUP_SUPERVISOR, FLOOR_WORKERS, FLOOR_ZONES, SUPERVISOR } from './seedOps'
import { useStore } from './store'
import type { Claim, Defect, GateEntry, Grn, Ncr } from './types'

const get = useStore.getState
const set = useStore.setState

const nextNo = (rows: { id: string }[]) => Math.max(0, ...rows.map((r) => Number(r.id.split('-')[1]))) + 1
const pad = (n: number) => String(n).padStart(4, '0')

/** Who approves today: the supervisor, or the backup while the supervisor is on leave. */
export const approver = () => (get().supervisorOnLeave ? BACKUP_SUPERVISOR : SUPERVISOR)

// ── Quality ─────────────────────────────────────────────────────────────

/** Force rejects through the camera, as the "Defect caught" scenario does. */
export function cameraReject(defect: Defect, count: number) {
  set((s) => {
    const added = Array.from({ length: count }, (_, k) => ({ id: s.camera.reject + k + 1, t: s.simTime + k * 4000, defect }))
    return {
      camera: {
        ...s.camera,
        reject: s.camera.reject + count,
        recent: [...s.camera.recent, ...added].slice(-10),
        flagging: [...s.camera.flagging, ...added.map((a) => a.defect)],
      },
    }
  })
}

export const takeFlag = () => set((s) => ({ camera: { ...s.camera, flagging: s.camera.flagging.slice(1) } }))

export function createNcr(n: Omit<Ncr, 'id' | 't'>) {
  const s = get()
  const id = `NCR-${pad(nextNo(s.ncrs))}`
  set({ ncrs: [{ ...n, id, t: s.simTime }, ...s.ncrs] })
  return id
}

export const setNcrStatus = (id: string, status: Ncr['status']) =>
  set((s) => ({ ncrs: s.ncrs.map((n) => (n.id === id ? { ...n, status } : n)) }))

// ── Stores ──────────────────────────────────────────────────────────────

export function receiveGrn(g: Omit<Grn, 'id' | 't'>) {
  const s = get()
  const id = `GRN-${pad(nextNo(s.grns))}`
  set({
    grns: [{ ...g, id, t: s.simTime }, ...s.grns],
    materials: s.materials.map((m) => {
      const line = g.lines.find((l) => l.material === m.id)
      return line ? { ...m, balance: m.balance + line.qty } : m
    }),
  })
  return id
}

export const setDo = (doStage: ReturnType<typeof get>['doStage'], doSample = get().doSample) => set({ doStage, doSample })

// ── Gate ────────────────────────────────────────────────────────────────

export function checkIn(e: Omit<GateEntry, 'id' | 'in' | 'out'>) {
  const s = get()
  const id = `G-${pad(nextNo(s.gate))}`
  set({ gate: [...s.gate, { ...e, id, in: s.simTime, out: null }] })
  return id
}

export const checkOut = (id: string) => set((s) => ({ gate: s.gate.map((g) => (g.id === id ? { ...g, out: s.simTime } : g)) }))

// ── People ──────────────────────────────────────────────────────────────

export function submitClaim(c: Pick<Claim, 'worker' | 'kind' | 'detail' | 'amount'>) {
  const s = get()
  const id = `CL-${pad(nextNo(s.claims))}`
  const to = approver()
  set({ claims: [{ ...c, id, t: s.simTime, status: 'Waiting', approver: null, decidedAt: null }, ...s.claims] })
  get().notify(
    {
      to: 'Supervisor',
      title: `${c.kind} from ${c.worker} · to ${to}`,
      body: `${c.detail} · ${c.amount}`,
      tone: 'info',
      claimId: id,
    },
    { toast: true },
  )
  return id
}

export function decideClaim(id: string, approve: boolean) {
  const s = get()
  const c = s.claims.find((x) => x.id === id)
  if (!c || c.status !== 'Waiting') return
  const by = approver()
  set({ claims: s.claims.map((x) => (x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected', approver: by, decidedAt: s.simTime } : x)) })
  get().notify({ to: 'Owner', title: `${c.kind} ${approve ? 'approved' : 'rejected'}`, body: `${c.worker} · ${c.amount}, by ${by}.`, tone: approve ? 'ok' : 'info' })
}

export function setOnLeave(onLeave: boolean) {
  set({ supervisorOnLeave: onLeave })
  get().notify({
    to: 'Owner',
    title: onLeave ? `${SUPERVISOR} on leave today` : `${SUPERVISOR} back today`,
    body: onLeave ? `Handover and approvals go to ${BACKUP_SUPERVISOR}.` : 'Handover and approvals go back to the supervisor.',
    tone: 'info',
  })
}

export function acknowledgeHandover(notes: string) {
  set((s) => ({ handover: { notes, ackBy: approver(), ackAt: s.simTime } }))
}

export function raiseSos(workerName: string) {
  const w = FLOOR_WORKERS.find((x) => x.name === workerName)!
  const zone = FLOOR_ZONES.find((z) => z.id === w.zone)!.name
  const s = get()
  const id = `SOS-${pad(s.sos.length + 1)}`
  set({ sos: [{ id, worker: w.name, zone, x: w.x, y: w.y, t: s.simTime, cleared: null }, ...s.sos] })
  get().notify({ to: 'Supervisor', title: `SOS: ${w.name}`, body: `${zone}. Badge alarm pressed. Go now.`, tone: 'alert' }, { toast: true })
  return id
}

export function clearSos(id: string) {
  const a = get().sos.find((x) => x.id === id)
  if (!a || a.cleared) return
  set((s) => ({ sos: s.sos.map((x) => (x.id === id ? { ...x, cleared: s.simTime } : x)) }))
  const mins = Math.max(1, Math.round((get().simTime - a.t) / 60000))
  get().notify({ to: 'Owner', title: `SOS cleared: ${a.worker}`, body: `Help reached ${a.zone} within ${num(mins)} min.`, tone: 'ok' })
}
