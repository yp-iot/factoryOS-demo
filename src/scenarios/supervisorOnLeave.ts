import { decideClaim, setOnLeave, submitClaim } from '../sim/ops'
import { BACKUP_SUPERVISOR, SUPERVISOR } from '../sim/seedOps'
import { useStore } from '../sim/store'
import { showPhone, type Scenario } from './runner'

const st = () => useStore.getState()

export function supervisorOnLeave(): Scenario {
  let claimId = ''
  const decided = () => st().claims.find((c) => c.id === claimId)?.status !== 'Waiting'
  return {
    id: 'supervisor-on-leave',
    title: 'Supervisor on leave',
    blurb: 'Handover and approvals go to the backup person.',
    concept: true,
    steps: [
      {
        caption: `Concept: ${SUPERVISOR}, the shift supervisor, is on leave today.`,
        run: () => {
          setOnLeave(true)
          st().openApp('shift-handover')
        },
        wait: 4500,
      },
      {
        caption: `The shift handover now goes to the backup, ${BACKUP_SUPERVISOR}. Nobody had to re-route it.`,
        wait: 4500,
      },
      {
        caption: `An overtime claim comes in. It goes to ${BACKUP_SUPERVISOR}’s phone.`,
        run: () => {
          st().openApp('e-claim')
          showPhone()
          claimId = submitClaim({ worker: 'Siti', kind: 'Overtime', detail: 'Today, 2 h after shift A, M3 restart', amount: '2.0 h' })
        },
        wait: 3500,
      },
      {
        caption: 'Approve it on the phone.',
        until: decided,
        hint: 'Tap Approve on the phone — or press Next',
        skip: () => decideClaim(claimId, true),
      },
      {
        caption: 'Approved. Work did not stop because one person was away. (Concept: backup approvers are not yet confirmed in the product.)',
      },
    ],
  }
}
