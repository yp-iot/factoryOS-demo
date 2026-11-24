export type MachineId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'P1'
export type RunState = 'run' | 'stop' | 'idle'
export type MaterialId = 'pp' | 'abs' | 'mb' | 'carton'

/** A status change. A machine's timeline is the list of these, oldest first. */
export interface Segment {
  start: number // sim epoch ms
  status: RunState
}

export interface Machine {
  id: MachineId
  kind: 'injection' | 'press'
  part: string
  material: 'pp' | 'abs'
  partWeightG: number
  cavities: number
  idealCycleS: number
  cycleS: number // current, wanders a little above ideal
  targetPerDay: number
  scrapRate: number
  runKW: number // typical draw while running

  status: RunState
  stopReason: string | null

  // counters for today (since 07:00)
  shotAcc: number // fractional shots carried between ticks
  good: number
  scrap: number
  runS: number
  stopS: number
  idleS: number
  kWh: number
  idleKWh: number

  // live readings
  kW: number
  currentA: number
  tempC: number

  segments: Segment[]
  kwLog: KwSample[]
}

export interface Material {
  id: MaterialId
  name: string
  unit: 'kg' | 'pcs'
  balance: number
  reorderLevel: number
  lineSide: number // issued to the floor, used before warehouse stock
}

export interface Breakdown {
  id: string
  machineId: MachineId
  start: number
  end: number | null
  alarm: string
  reason: string | null
  technician: string
  oeeAtStart?: number // the machine's OEE when it stopped, to show the drop
}

export interface PhoneMessage {
  id: string
  t: number
  to: 'Owner' | 'Technician' | 'Supervisor' | 'Stores'
  title: string
  body: string
  tone: 'alert' | 'info' | 'ok'
  claimId?: string // shows Approve / Reject on the phone
}

export type View =
  | { kind: 'home' }
  | { kind: 'area'; area: AreaId }
  | { kind: 'app'; app: AppId }

export type AreaId = 'production' | 'maintenance' | 'quality' | 'stores' | 'energy' | 'people'

export type AppId =
  | 'daily-production'
  | 'work-orders'
  | 'shift-handover'
  | 'oee'
  | 'breakdown'
  | 'pm-schedule'
  | 'spare-parts'
  | 'machine-status'
  | 'final-qc'
  | 'ncr'
  | 'first-article'
  | 'ai-camera'
  | 'material-control'
  | 'grn'
  | 'ai-do'
  | 'voice-warehouse'
  | 'wh-dashboard'
  | 'inventory'
  | 'wh-map'
  | 'operator-station'
  | 'job-costing'
  | 'scrap-revenue'
  | 'power-cost'
  | 'aircon'
  | 'e-claim'
  | 'roster'
  | 'sos'
  | 'gate'

export type Speed = 0 | 1 | 10 | 60

/** One 15-minute power reading, for the 24-hour chart. */
export interface KwSample {
  t: number
  kW: number
  status: RunState
}

export interface WorkOrder {
  id: string
  part: string
  machineId: MachineId
  qty: number
  made: number // good parts counted from the machine
  pricePerPart: number // RM
  created: number
  due: number
  startedAt: number | null
  qcAt: number | null
  doneAt: number | null
}

export type WorkOrderStatus = 'released' | 'running' | 'qc' | 'done'

export interface MaterialRequest {
  id: string
  woId: string
  machineId: MachineId
  material: MaterialId
  qty: number
  working: string // how the suggested quantity was worked out
  requestedAt: number
  issuedAt: number | null
}

export type Defect = 'Short shot' | 'Flash' | 'Sink mark' | 'Black spot' | 'Warpage'

/** The AI camera watching M5's output. */
export interface CameraState {
  good: number
  reject: number
  recent: { id: number; t: number; defect: Defect }[]
  flagging: Defect[] // defects the drawn conveyor still has to show with a box
}

export interface Ncr {
  id: string
  t: number
  source: 'AI camera' | 'Customer return' | 'Final QC'
  part: string
  machineId: MachineId
  defect: string
  qty: number
  status: 'Draft' | 'Open' | 'Closed'
  owner: string
}

export interface GateEntry {
  id: string
  plate: string | null
  kind: 'Lorry' | 'Visitor' | 'Contractor'
  who: string
  purpose: string
  in: number
  out: number | null
}

export interface Grn {
  id: string
  t: number
  supplier: string
  doNo: string
  lines: { material: MaterialId; qty: number }[]
  by: 'Typed in' | 'AI read'
}

export interface Claim {
  id: string
  worker: string
  kind: 'Overtime' | 'Meal claim' | 'Mileage'
  detail: string
  amount: string
  t: number
  status: 'Waiting' | 'Approved' | 'Rejected'
  approver: string | null
  decidedAt: number | null
}

export interface SosAlert {
  id: string
  worker: string
  zone: string
  x: number // % across the floor plan
  y: number
  t: number
  cleared: number | null
}

export type DoStage = 'idle' | 'reading' | 'check' | 'saved'

// ── Warehouse ───────────────────────────────────────────────────────────

/** Raw material and packaging share ids with `Material`; each machine's part has its own finished-goods item. */
export type SkuId = MaterialId | 'tape' | `fg-${MachineId}`

export interface Sku {
  id: SkuId
  code: string
  name: string
  category: 'Raw material' | 'Packaging' | 'Finished goods'
  unit: 'kg' | 'pcs' | 'ctn' | 'roll'
  unitCost: number // RM per unit
  reorder: number
}

/** One rack bay, seen from above on the warehouse map. */
export interface Bin {
  id: string // "B3"
  rack: string
  bay: number
  sku: SkuId | null
  cap: number
}

export type TxnType = 'Receipt' | 'Put-away' | 'Issue' | 'Dispatch' | 'Adjust' | 'Write-off'

export interface Txn {
  id: string
  t: number
  type: TxnType
  sku: SkuId
  qty: number // + into the warehouse, − out of it, 0 for a move inside it
  from: string
  to: string
  by: string
  ref: string
}

/** Stock sitting on a dock, waiting to be put away. */
export interface Staged {
  id: string
  sku: SkuId
  qty: number
  ref: string
  t: number
}

export interface OutOrder {
  id: string // DO number
  customer: string
  lines: { sku: SkuId; qty: number }[]
  due: number
  dispatchedAt: number | null
  by: string | null
}

export interface CycleCount {
  id: string
  bin: string
  t: number
  counted: number | null
  expected: number | null
  doneAt: number | null
  by: string | null
  actualDiff: number // how far the shelf really is from the system; the operator finds it
}

export interface Warehouse {
  fg: Record<MachineId, number> // cartons in the finished-goods racks
  fgPallets: Record<MachineId, number> // pallets from each machine already put away today
  tape: number
  staged: Staged[]
  orders: OutOrder[]
  counts: CycleCount[]
  txns: Txn[]
}
