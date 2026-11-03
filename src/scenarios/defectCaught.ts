import { cameraReject, createNcr } from '../sim/ops'
import { useStore } from '../sim/store'
import type { Scenario } from './runner'

const st = () => useStore.getState()

export function defectCaught(): Scenario {
  let rejectsBefore = 0
  return {
    id: 'defect-caught',
    title: 'Defect caught',
    blurb: 'The camera flags short-shot parts and an NCR drafts itself.',
    steps: [
      {
        caption: 'A camera checks every wall switch cover coming off M5.',
        run: () => {
          st().setStatus('M5', 'run')
          if (st().speed === 0) st().setSpeed(1)
          rejectsBefore = st().camera.reject
          st().openApp('ai-camera')
        },
        wait: 4000,
      },
      {
        caption: 'Three short-shot parts. The camera boxes each one in red and rejects it.',
        run: () => cameraReject('Short shot', 3),
        wait: 5500,
      },
      {
        caption: 'The reject counter went up by itself. Nobody counted by hand.',
        wait: 3500,
      },
      {
        caption: 'An NCR draft is already written, ready for QC to check.',
        run: () => {
          const s = st()
          const n = s.camera.reject - rejectsBefore
          createNcr({ source: 'AI camera', part: 'Wall switch cover', machineId: 'M5', defect: `Short shot, ${n} parts in a row`, qty: n, status: 'Draft', owner: 'QC' })
          s.notify({ to: 'Supervisor', title: 'NCR draft: M5 short shot', body: `${n} short-shot parts in a row on M5. Draft ready for QC.`, tone: 'alert' }, { toast: true })
          s.openApp('ncr')
        },
        wait: 4500,
      },
      {
        caption: 'QC only checks it and taps “Check & open”. The write-up is done.',
      },
    ],
  }
}
