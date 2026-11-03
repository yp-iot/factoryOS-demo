// Seed data for the quality, stores and people apps. All names are fictional.
import type { CameraState, Claim, Defect, GateEntry, Grn, Machine, Ncr } from './types'

const at = (base: number, hh: number, mm: number, dayOffset = 0) => {
  const d = new Date(base + dayOffset * 86400000)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

export const SUPERVISOR = 'Puan Rosnah'
export const BACKUP_SUPERVISOR = 'Encik Farid'

export const DEFECTS: Defect[] = ['Short shot', 'Flash', 'Sink mark', 'Black spot', 'Warpage']

export function seedCamera(now: number, machines: Machine[]): CameraState {
  const m5 = machines.find((m) => m.id === 'M5')!
  const order: Defect[] = ['Flash', 'Black spot', 'Flash', 'Sink mark', 'Short shot', 'Flash', 'Black spot', 'Flash', 'Sink mark', 'Flash']
  return {
    good: m5.good,
    reject: m5.scrap,
    recent: order.map((defect, i) => ({ id: i + 1, t: now - (10 - i) * 7 * 60000, defect })),
    flagging: [],
  }
}

export function seedNcrs(now: number): Ncr[] {
  return [
    { id: 'NCR-0051', t: at(now, 16, 30, -1), source: 'Customer return', part: 'Food container lid', machineId: 'M2', defect: 'Warpage, lid does not seal', qty: 240, status: 'Open', owner: 'QC' },
    { id: 'NCR-0050', t: at(now, 11, 5, -2), source: 'Final QC', part: 'Plant pot 6 inch', machineId: 'M4', defect: 'Black spots on rim', qty: 60, status: 'Closed', owner: 'QC' },
    { id: 'NCR-0049', t: at(now, 14, 20, -5), source: 'Customer return', part: 'Bottle cap 28 mm', machineId: 'M1', defect: 'Thread flash', qty: 1800, status: 'Closed', owner: 'QC' },
  ]
}

export function seedGate(now: number): GateEntry[] {
  return [
    { id: 'G-0412', plate: 'VBN 2291', kind: 'Lorry', who: 'Contoh Kotak Sdn Bhd', purpose: 'Delivery: cartons', in: at(now, 8, 10), out: at(now, 8, 40) },
    { id: 'G-0413', plate: 'WPL 7720', kind: 'Contractor', who: 'Aircon service team', purpose: 'Office aircon service', in: at(now, 8, 45), out: null },
    { id: 'G-0414', plate: null, kind: 'Visitor', who: 'Mould supplier rep', purpose: 'M6 mould trial', in: at(now, 9, 0), out: null },
    { id: 'G-0415', plate: 'BMF 105', kind: 'Visitor', who: 'Customer quality auditor', purpose: 'Audit visit', in: at(now, 9, 15), out: null },
  ]
}

export function seedGrns(now: number): Grn[] {
  return [
    { id: 'GRN-0218', t: at(now, 8, 25), supplier: 'Contoh Kotak Sdn Bhd', doNo: 'CK-4402', lines: [{ material: 'carton', qty: 1000 }], by: 'Typed in' },
    { id: 'GRN-0217', t: at(now, 15, 10, -1), supplier: 'Contoh Polimer Sdn Bhd', doNo: 'CP-88123', lines: [{ material: 'abs', qty: 1500 }], by: 'AI read' },
    { id: 'GRN-0216', t: at(now, 10, 40, -2), supplier: 'Contoh Resin Sdn Bhd', doNo: 'CR-77790', lines: [{ material: 'pp', qty: 2000 }, { material: 'mb', qty: 50 }], by: 'AI read' },
  ]
}

export function seedClaims(now: number): Claim[] {
  return [
    { id: 'CL-0331', worker: 'Raju', kind: 'Overtime', detail: 'Mon, 2 h after shift B, M2 mould change', amount: '2.0 h', t: at(now, 7, 40), status: 'Waiting', approver: null, decidedAt: null },
    { id: 'CL-0330', worker: 'Mei Ling', kind: 'Meal claim', detail: 'Overtime meal, Sat', amount: 'RM 12.00', t: at(now, 17, 5, -1), status: 'Waiting', approver: null, decidedAt: null },
    { id: 'CL-0329', worker: 'Hafiz', kind: 'Mileage', detail: 'Spare parts pickup, 46 km', amount: 'RM 27.60', t: at(now, 12, 30, -1), status: 'Approved', approver: SUPERVISOR, decidedAt: at(now, 14, 0, -1) },
    { id: 'CL-0328', worker: 'Nurul', kind: 'Overtime', detail: 'Sun, 4 h stock count', amount: '4.0 h', t: at(now, 9, 0, -2), status: 'Approved', approver: SUPERVISOR, decidedAt: at(now, 10, 15, -2) },
  ]
}

/** Who is on the floor, and roughly where, for the SOS floor plan. */
export const FLOOR_ZONES = [
  { id: 'moulding', name: 'Moulding hall', x: 2, y: 2, w: 56, h: 52 },
  { id: 'press', name: 'Press area', x: 60, y: 2, w: 18, h: 30 },
  { id: 'qc', name: 'QC room', x: 80, y: 2, w: 18, h: 30 },
  { id: 'raw', name: 'Raw material store', x: 2, y: 56, w: 30, h: 42 },
  { id: 'fg', name: 'Finished goods', x: 34, y: 56, w: 30, h: 42 },
  { id: 'bay', name: 'Loading bay', x: 66, y: 56, w: 32, h: 42 },
  { id: 'office', name: 'Office', x: 60, y: 34, w: 38, h: 20 },
]

export const FLOOR_WORKERS = [
  { name: 'Siti', zone: 'moulding', x: 12, y: 18 },
  { name: 'Raju', zone: 'moulding', x: 30, y: 14 },
  { name: 'Ah Kow', zone: 'moulding', x: 46, y: 22 },
  { name: 'Farah', zone: 'moulding', x: 20, y: 38 },
  { name: 'Daniel', zone: 'moulding', x: 40, y: 42 },
  { name: 'Ali', zone: 'moulding', x: 52, y: 10 },
  { name: 'Ravi', zone: 'press', x: 68, y: 16 },
  { name: 'Mei Ling', zone: 'qc', x: 88, y: 14 },
  { name: 'Aminah', zone: 'raw', x: 14, y: 76 },
  { name: 'Zul', zone: 'raw', x: 24, y: 86 },
  { name: 'Lim', zone: 'fg', x: 46, y: 72 },
  { name: 'Priya', zone: 'fg', x: 54, y: 88 },
  { name: 'Azman', zone: 'bay', x: 78, y: 80 },
  { name: 'Nurul', zone: 'office', x: 72, y: 44 },
]
