import { saveDo } from '../areas/stores/doSamples'
import { checkIn, setDo } from '../sim/ops'
import { useStore } from '../sim/store'
import type { Scenario } from './runner'

const st = () => useStore.getState()

export function deliveryArrives(): Scenario {
  return {
    id: 'delivery-arrives',
    title: 'Delivery arrives',
    blurb: 'A lorry checks in, the delivery order is read, stock goes up.',
    steps: [
      {
        caption: 'A resin lorry arrives. The gate camera reads the plate and logs it.',
        run: () => {
          checkIn({ kind: 'Lorry', plate: 'WXY 4821', who: 'Contoh Resin Sdn Bhd', purpose: 'Delivery: PP resin, masterbatch' })
          st().openApp('gate')
        },
        wait: 4000,
      },
      {
        caption: 'Stores snaps the delivery order. The AI reads supplier, items and quantities.',
        run: () => {
          setDo('idle', 0)
          st().openApp('ai-do')
          setDo('reading', 0)
        },
        wait: 4200,
      },
      {
        caption: 'The GRN is filled in. A person checks it against the paper before saving.',
        until: (s) => s.doStage === 'saved',
        hint: 'Tick “I checked it”, then Save GRN — or press Next',
        skip: () => saveDo(0),
      },
      {
        caption: 'Saved. PP resin stock went up by 2,000 kg, and the GRN is in the list.',
        run: () => st().openApp('grn'),
      },
    ],
  }
}
