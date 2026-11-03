import { receiveGrn, setDo } from '../../sim/ops'
import { useStore } from '../../sim/store'
import type { MaterialId } from '../../sim/types'

/** Fictional delivery orders the "AI reads" app can pick from. */
export interface DoSample {
  supplier: string
  address: string
  doNo: string
  date: string
  lorry: string
  lines: { code: string; desc: string; material: MaterialId; packs: string; qty: number }[]
}

export const DO_SAMPLES: DoSample[] = [
  {
    supplier: 'Contoh Resin Sdn Bhd',
    address: 'Lot 12, Jalan Contoh 3, Kawasan Perindustrian Demo',
    doNo: 'CR-77841',
    date: 'Today',
    lorry: 'WXY 4821',
    lines: [
      { code: 'PP-H030', desc: 'PP homopolymer', material: 'pp', packs: '80 bags × 25 kg', qty: 2000 },
      { code: 'MB-WHT2', desc: 'White masterbatch', material: 'mb', packs: '2 bags × 25 kg', qty: 50 },
    ],
  },
  {
    supplier: 'Contoh Kotak Sdn Bhd',
    address: 'No. 8, Jalan Kotak 1, Taman Industri Contoh',
    doNo: 'CK-4411',
    date: 'Today',
    lorry: 'VBN 2291',
    lines: [{ code: 'CTN-B4', desc: 'Carton box, 5-ply, B4', material: 'carton', packs: '30 bundles × 50', qty: 1500 }],
  },
  {
    supplier: 'Contoh Polimer Sdn Bhd',
    address: 'PT 455, Jalan Polimer, Zon Perindustrian Demo',
    doNo: 'CP-88207',
    date: 'Today',
    lorry: 'JTR 6630',
    lines: [{ code: 'ABS-750', desc: 'ABS general purpose, natural', material: 'abs', packs: '40 bags × 25 kg', qty: 1000 }],
  },
]

/** Save what the AI read as a GRN; a person has already checked it. */
export function saveDo(sample = useStore.getState().doSample, lines = DO_SAMPLES[sample].lines) {
  const d = DO_SAMPLES[sample]
  const id = receiveGrn({ supplier: d.supplier, doNo: d.doNo, lines: lines.map((l) => ({ material: l.material, qty: l.qty })), by: 'AI read' })
  setDo('saved')
  return id
}
