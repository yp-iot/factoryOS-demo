import { useStore } from '../sim/store'
import type { Speed } from '../sim/types'
import type { Scenario } from './runner'

const st = () => useStore.getState()

export function machineStops(): Scenario {
  let breakdownId = ''
  let speedBefore: Speed = 1
  const isResolved = () => st().breakdowns.find((b) => b.id === breakdownId)?.end != null

  return {
    id: 'machine-stops',
    title: 'Machine stops',
    blurb: 'M3 stops on a mould temperature alarm. Watch the report open itself and the clock start.',
    steps: [
      {
        caption: 'Every machine on the floor is live. Keep an eye on M3.',
        run: () => {
          const s = st()
          s.breakdowns.filter((b) => b.machineId === 'M3' && b.end === null).forEach((b) => s.resolveBreakdown(b.id))
          s.setStatus('M3', 'run')
          s.go({ kind: 'home' })
        },
        wait: 3500,
      },
      {
        caption: 'M3 has just stopped. Its light turned red by itself.',
        run: () => {
          breakdownId = st().reportBreakdown('M3', 'Mould temp alarm', { technician: 'Ali', open: false })
        },
        wait: 3000,
      },
      {
        caption: 'The breakdown report opened itself. Nobody had to fill in a form.',
        run: () => st().openApp('breakdown'),
        wait: 3500,
      },
      {
        caption: 'Technician Ali gets the alert on the phone straight away.',
        run: () => {
          const s = st()
          s.setPhoneOpen(true)
          s.notify({ to: 'Technician', title: 'Technician Ali', body: 'M3 stopped, mould temp alarm', tone: 'alert' }, { toast: true })
        },
        wait: 4500,
      },
      {
        caption: 'Fast-forward 60×: the downtime clock runs and M3’s OEE drops minute by minute.',
        run: () => {
          speedBefore = st().speed
          st().setSpeed(60)
        },
        wait: 6000,
      },
      {
        caption: 'Pick a reason, then tap Resolved when M3 is fixed.',
        run: () => st().setSpeed(speedBefore || 1),
        until: isResolved,
        hint: 'Tap a reason, then “Resolved” — or press Next',
        skip: () => {
          st().setBreakdownReason(breakdownId, 'Heater band replaced')
          st().resolveBreakdown(breakdownId)
        },
      },
      {
        caption: 'M3 is back to green. The stop is in the history with its downtime minutes.',
        run: () => st().go({ kind: 'home' }),
      },
    ],
  }
}
