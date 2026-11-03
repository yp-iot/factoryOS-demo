import { clearSos, raiseSos } from '../sim/ops'
import { useStore } from '../sim/store'
import { showPhone, type Scenario } from './runner'

const st = () => useStore.getState()

export function workerSos(): Scenario {
  let alertId = ''
  return {
    id: 'worker-sos',
    title: 'Worker SOS',
    blurb: 'A badge alert shows exactly where on the floor.',
    steps: [
      {
        caption: 'Every worker on the floor wears a badge. This is where everyone is right now.',
        run: () => {
          const s = st()
          s.sos.filter((a) => a.cleared === null).forEach((a) => clearSos(a.id))
          s.openApp('sos')
        },
        wait: 4000,
      },
      {
        caption: 'Aminah presses SOS in the raw material store.',
        run: () => {
          alertId = raiseSos('Aminah')
          showPhone()
        },
        wait: 3500,
      },
      {
        caption: 'The supervisor and first aiders get the alert with the exact location.',
        wait: 4000,
      },
      {
        caption: 'When someone reaches Aminah, tap “Help is there”.',
        until: (s) => s.sos.find((a) => a.id === alertId)?.cleared != null,
        hint: 'Tap “Help is there” — or press Next',
        skip: () => clearSos(alertId),
      },
      {
        caption: 'Cleared. The alert and how long help took are logged.',
      },
    ],
  }
}
