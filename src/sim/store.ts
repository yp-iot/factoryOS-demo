import { create } from 'zustand'
import { logPower, nextRandom, oee, tick } from './engine'
import { progressOrders, suggestMaterial } from './orders'
import { seedBreakdowns, seedMachines, seedMaterials, seedMessages, seedRequests, seedWorkOrders, startTime, TECHNICIANS } from './seed'
import { DEFECTS, seedCamera, seedClaims, seedGate, seedGrns, seedNcrs } from './seedOps'
import type {
  AppId,
  Breakdown,
  CameraState,
  Claim,
  DoStage,
  GateEntry,
  Grn,
  Machine,
  MachineId,
  Material,
  MaterialRequest,
  Ncr,
  PhoneMessage,
  RunState,
  SosAlert,
  Speed,
  View,
  WorkOrder,
} from './types'

export const TICK_MS = 2000

export interface ScenarioState {
  id: string
  title: string
  step: number
  total: number
  caption: string
  hint: string | null // shown when a step waits for the presenter to act
  done: boolean
}

interface SimData {
  simTime: number
  lastTickAt: number // real ms, used to interpolate the clock between ticks
  speed: Speed
  seed: number
  ratePerKWh: number
  machines: Machine[]
  materials: Material[]
  breakdowns: Breakdown[]
  messages: PhoneMessage[]
  workOrders: WorkOrder[]
  requests: MaterialRequest[]
  camera: CameraState
  ncrs: Ncr[]
  gate: GateEntry[]
  grns: Grn[]
  claims: Claim[]
  sos: SosAlert[]
  supervisorOnLeave: boolean
  handover: { notes: string; ackBy: string | null; ackAt: number | null }
  doStage: DoStage
  doSample: number
  /** Light apps keep their screen state here so it survives navigation and clears on Reset. */
  appState: Record<string, unknown>
  nextId: number

  view: View
  powerMachine: MachineId // machine shown in Power Cost's 24-hour chart
  phoneOpen: boolean
  scenariosOpen: boolean
  toast: PhoneMessage | null
  scenario: ScenarioState | null
}

interface Actions {
  tick: () => void
  setSpeed: (s: Speed) => void
  reset: () => void
  setRate: (r: number) => void
  go: (v: View) => void
  openApp: (app: AppId) => void
  setPhoneOpen: (open: boolean) => void
  setPowerMachine: (id: MachineId) => void
  setScenariosOpen: (open: boolean) => void
  dismissToast: () => void
  setScenario: (s: ScenarioState | null) => void

  setStatus: (id: MachineId, status: RunState, reason?: string | null) => void
  reportBreakdown: (id: MachineId, alarm: string, opts?: { technician?: string; open?: boolean }) => string
  setBreakdownReason: (id: string, reason: string) => void
  resolveBreakdown: (id: string) => void
  notify: (msg: Omit<PhoneMessage, 'id' | 't'>, opts?: { toast?: boolean }) => void

  createWorkOrder: (o: { machineId: MachineId; qty: number; dueDays: number }) => string
  requestMaterial: (woId: string) => string | null
  issueRequest: (id: string) => void
}

export type Store = SimData & Actions

/** The camera sees every M5 part: one reject entry per scrapped shot. */
function watchM5(cam: CameraState, before: Machine[], after: Machine[], now: number, rand: () => number): CameraState {
  const i = after.findIndex((m) => m.id === 'M5')
  const m = after[i]
  const good = m.good - before[i].good
  const scrap = m.scrap - before[i].scrap
  if (good <= 0 && scrap <= 0) return cam
  const shots = Math.round(scrap / m.cavities)
  const added = Array.from({ length: shots }, (_, k) => ({ id: cam.reject + k + 1, t: now, defect: DEFECTS[1 + Math.floor(rand() * 4)] }))
  return {
    ...cam,
    good: cam.good + good,
    reject: cam.reject + scrap,
    recent: [...cam.recent, ...added].slice(-10),
    flagging: [...cam.flagging, ...added.map((a) => a.defect)].slice(-4),
  }
}

/** WO-1107 → 1108 */
const nextNumber = (rows: { id: string }[]) => Math.max(...rows.map((r) => Number(r.id.split('-')[1]))) + 1

function initial(): SimData {
  const now = startTime()
  const machines = seedMachines(now)
  return {
    simTime: now,
    lastTickAt: Date.now(),
    speed: 1,
    seed: 20260722,
    ratePerKWh: 0.5,
    machines,
    materials: seedMaterials(),
    breakdowns: seedBreakdowns(now),
    messages: seedMessages(now),
    workOrders: seedWorkOrders(now, machines),
    requests: seedRequests(now),
    camera: seedCamera(now, machines),
    ncrs: seedNcrs(now),
    gate: seedGate(now),
    grns: seedGrns(now),
    claims: seedClaims(now),
    sos: [],
    supervisorOnLeave: false,
    handover: { notes: '', ackBy: null, ackAt: null },
    doStage: 'idle',
    doSample: 0,
    appState: {},
    nextId: 419,
    view: { kind: 'home' },
    powerMachine: 'M6',
    phoneOpen: false,
    scenariosOpen: false,
    toast: null,
    scenario: null,
  }
}

export const useStore = create<Store>()((set, get) => ({
  ...initial(),

  tick: () => {
    const s = get()
    if (s.speed === 0) return set({ lastTickAt: Date.now() })
    const dtS = (TICK_MS / 1000) * s.speed
    let seed = s.seed
    const rand = () => {
      const [r, next] = nextRandom(seed)
      seed = next
      return r
    }
    const simTime = s.simTime + dtS * 1000
    const ticked = tick(s.machines, s.materials, dtS, rand)
    const made: Partial<Record<MachineId, number>> = {}
    ticked.machines.forEach((m, i) => (made[m.id] = m.good - s.machines[i].good))
    set({
      camera: watchM5(s.camera, s.machines, ticked.machines, simTime, rand),
      machines: logPower(ticked.machines, simTime),
      materials: ticked.materials,
      workOrders: progressOrders(s.workOrders, made, ticked.machines, simTime),
      seed,
      simTime,
      lastTickAt: Date.now(),
    })
  },

  setSpeed: (speed) => set({ speed, lastTickAt: Date.now() }),
  reset: () => set({ ...initial() }),
  setRate: (ratePerKWh) => set({ ratePerKWh }),
  go: (view) => set({ view }),
  openApp: (app) => set({ view: { kind: 'app', app } }),
  setPhoneOpen: (phoneOpen) => set({ phoneOpen }),
  setPowerMachine: (powerMachine) => set({ powerMachine }),
  setScenariosOpen: (scenariosOpen) => set({ scenariosOpen }),
  dismissToast: () => set({ toast: null }),
  setScenario: (scenario) => set({ scenario }),

  setStatus: (id, status, reason = null) =>
    set((s) => ({
      machines: s.machines.map((m) =>
        m.id !== id || m.status === status
          ? m
          : { ...m, status, stopReason: status === 'run' ? null : reason, segments: [...m.segments, { start: s.simTime, status }] },
      ),
    })),

  // A machine stop opens its own breakdown report; that is the point of the app.
  reportBreakdown: (machineId, alarm, opts = {}) => {
    const s = get()
    const existing = s.breakdowns.find((b) => b.machineId === machineId && b.end === null)
    if (existing) return existing.id
    const id = `BD-0${s.nextId}`
    const technician = opts.technician ?? TECHNICIANS[s.nextId % TECHNICIANS.length]
    const oeeAtStart = oee(s.machines.find((m) => m.id === machineId)!).oee
    get().setStatus(machineId, 'stop', alarm)
    set((st) => ({
      nextId: st.nextId + 1,
      breakdowns: [{ id, machineId, start: st.simTime, end: null, alarm, reason: null, technician, oeeAtStart }, ...st.breakdowns],
    }))
    if (opts.open !== false) get().openApp('breakdown')
    return id
  },

  setBreakdownReason: (id, reason) =>
    set((s) => ({ breakdowns: s.breakdowns.map((b) => (b.id === id ? { ...b, reason } : b)) })),

  resolveBreakdown: (id) => {
    const b = get().breakdowns.find((x) => x.id === id)
    if (!b || b.end !== null) return
    set((s) => ({
      breakdowns: s.breakdowns.map((x) => (x.id === id ? { ...x, end: s.simTime, reason: x.reason ?? x.alarm } : x)),
    }))
    get().setStatus(b.machineId, 'run')
    get().notify({ to: 'Owner', title: `${b.machineId} running again`, body: `Fixed by Technician ${b.technician}.`, tone: 'ok' }, { toast: true })
  },

  createWorkOrder: ({ machineId, qty, dueDays }) => {
    const s = get()
    const m = s.machines.find((x) => x.id === machineId)!
    const id = `WO-${nextNumber(s.workOrders)}`
    const prev = s.workOrders.find((o) => o.machineId === machineId)
    const wo: WorkOrder = {
      id,
      part: m.part,
      machineId,
      qty,
      made: 0,
      pricePerPart: prev?.pricePerPart ?? 0.5,
      created: s.simTime,
      due: s.simTime + dueDays * 86400000,
      startedAt: null,
      qcAt: null,
      doneAt: null,
    }
    set({ workOrders: [...s.workOrders, wo] })
    return id
  },

  // Production asks; the quantity is worked out from what the order still needs.
  requestMaterial: (woId) => {
    const s = get()
    const wo = s.workOrders.find((o) => o.id === woId)
    if (!wo) return null
    const m = s.machines.find((x) => x.id === wo.machineId)!
    const { resinKg, working } = suggestMaterial(wo, m)
    if (resinKg <= 0) return null
    const id = `MR-0${nextNumber(s.requests)}`
    const req: MaterialRequest = { id, woId, machineId: wo.machineId, material: m.material, qty: resinKg, working, requestedAt: s.simTime, issuedAt: null }
    set({ requests: [req, ...s.requests] })
    get().notify({ to: 'Stores', title: `Material request ${id}`, body: `${resinKg} kg ${m.material.toUpperCase()} resin for ${wo.id} on ${wo.machineId}. Tap to approve.`, tone: 'info' })
    return id
  },

  issueRequest: (id) => {
    const s = get()
    const req = s.requests.find((r) => r.id === id)
    if (!req || req.issuedAt !== null) return
    set({
      requests: s.requests.map((r) => (r.id === id ? { ...r, issuedAt: s.simTime } : r)),
      materials: s.materials.map((mat) =>
        mat.id === req.material ? { ...mat, balance: Math.max(0, mat.balance - req.qty), lineSide: mat.lineSide + req.qty } : mat,
      ),
    })
  },

  notify: (msg, opts = {}) =>
    set((s) => {
      const m: PhoneMessage = { ...msg, id: `msg-${s.nextId}-${s.messages.length}`, t: s.simTime }
      return { messages: [m, ...s.messages], toast: opts.toast ? m : s.toast }
    }),
}))
