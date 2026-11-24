// Demo data for the quality screens, shared with the assistant.

export interface Inspection {
  batch: string
  wo: string
  part: string
  sample: number
  defects: number
  pass: boolean
  t: number
}

// Pass rate for the last 7 days, oldest first.
export const WEEK = [96, 94, 97, 92, 95, 98, 96]

export function seedInspections(now: number): Inspection[] {
  const h = 3600000
  return [
    { batch: 'B-2207', wo: 'WO-1102', part: 'Food container lid', sample: 50, defects: 0, pass: true, t: now - 0.5 * h },
    { batch: 'B-2206', wo: 'WO-1101', part: 'Bottle cap 28 mm', sample: 80, defects: 1, pass: true, t: now - 1.2 * h },
    { batch: 'B-2205', wo: 'WO-1105', part: 'Wall switch cover', sample: 50, defects: 4, pass: false, t: now - 1.8 * h },
    { batch: 'B-2204', wo: 'WO-1103', part: 'Switch box housing', sample: 32, defects: 0, pass: true, t: now - 2.3 * h },
  ]
}
