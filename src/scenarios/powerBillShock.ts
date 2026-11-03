import { rm } from '../lib/format'
import { useStore } from '../sim/store'
import type { Speed } from '../sim/types'
import { showPhone, type Scenario } from './runner'

const st = () => useStore.getState()

export function powerBillShock(): Scenario {
  let speedBefore: Speed = 1
  let idleBefore = 0
  return {
    id: 'power-bill-shock',
    title: 'Power bill shock',
    blurb: 'P1 is left running idle. See what that costs.',
    steps: [
      {
        caption: 'P1 has finished its job. Nobody switches it off. Heaters and pump stay on.',
        run: () => {
          const s = st()
          idleBefore = s.machines.find((m) => m.id === 'P1')!.idleKWh
          s.setStatus('P1', 'idle', 'Left on, no job')
          s.setPowerMachine('P1')
          s.go({ kind: 'home' })
        },
        wait: 4000,
      },
      {
        caption: 'Fast-forward 60×: P1 sits idle and keeps drawing power. Watch the amber bars.',
        run: () => {
          speedBefore = st().speed
          st().setSpeed(60)
          st().openApp('power-cost')
        },
        wait: 8000,
      },
      {
        caption: 'An alert goes to the owner’s phone: P1 is idle with power on.',
        run: () => {
          const s = st()
          s.setSpeed(speedBefore || 1)
          const p1 = s.machines.find((m) => m.id === 'P1')!
          showPhone()
          s.notify(
            {
              to: 'Owner',
              title: 'P1 idle with power on',
              body: `${rm((p1.idleKWh - idleBefore) * s.ratePerKWh)} spent while idle since it stopped, ${rm(p1.idleKWh * s.ratePerKWh)} today. Switch it off?`,
              tone: 'alert',
            },
            { toast: true },
          )
        },
        wait: 5000,
      },
      {
        caption: 'Idle time is easy to miss on the floor. Here it has a number in RM.',
      },
    ],
  }
}
