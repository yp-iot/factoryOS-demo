import { CheckCircle2, Lock, Square, SquareCheck } from 'lucide-react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { statusOf } from '../../sim/orders'
import { useStore } from '../../sim/store'

const CHECKS = [
  'Mould and part number match the work order',
  'Material and colour match the order (resin, masterbatch)',
  'Key dimensions within drawing tolerance',
  'Weight within ±2% of standard',
  'No short shot, flash or sink marks',
  'Label and carton quantity correct',
]

interface Fai {
  ticked: number[]
  signedBy: string | null
  signedAt: number | null
}

export function FirstArticle() {
  const orders = useStore((s) => s.workOrders).filter((o) => statusOf(o) === 'released')
  const now = useStore((s) => s.simTime)
  const [state, setState] = useAppState<Record<string, Fai>>('fai', () => ({}))
  const [woId, setWoId] = useAppState('fai-wo', () => orders[0]?.id ?? '')
  const wo = orders.find((o) => o.id === woId) ?? orders[0]
  if (!wo) {
    return (
      <div>
        <AppHeader app="first-article" />
        <Card className="text-dim">No released work orders are waiting to start.</Card>
      </div>
    )
  }
  const fai = state[wo.id] ?? { ticked: [], signedBy: null, signedAt: null }
  const update = (f: Fai) => setState({ ...state, [wo.id]: f })
  const all = fai.ticked.length === CHECKS.length

  return (
    <div>
      <AppHeader app="first-article" />
      <div className="grid grid-cols-[18rem_minmax(0,1fr)] gap-4">
        <Card className="p-2">
          <div className="px-2 py-1 text-xs text-dim uppercase">Waiting to start</div>
          {orders.map((o) => {
            const signed = state[o.id]?.signedBy
            return (
              <button
                key={o.id}
                onClick={() => setWoId(o.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left ${o.id === wo.id ? 'bg-accent/15' : 'hover:bg-panel-2'}`}
              >
                {signed ? <CheckCircle2 size={18} className="text-run" /> : <Lock size={18} className="text-idle" />}
                <span className="flex-1">
                  <span className="block font-semibold">
                    {o.id} · {o.machineId}
                  </span>
                  <span className="block text-xs text-dim">{o.part}</span>
                </span>
              </button>
            )
          })}
        </Card>
        <Card>
          <div className="mb-1 flex items-center gap-3">
            <h2 className="text-xl font-bold">
              {wo.id} · {wo.part}
            </h2>
            {fai.signedBy ? (
              <span className="rounded bg-run/15 px-2 py-0.5 text-xs font-bold text-run">Cleared to start</span>
            ) : (
              <span className="rounded bg-idle/15 px-2 py-0.5 text-xs font-bold text-idle">Waiting for sign-off</span>
            )}
          </div>
          <p className="mb-4 text-sm text-dim">Check the first good part off {wo.machineId} before the run starts.</p>
          <div className="flex flex-col gap-2">
            {CHECKS.map((c, i) => {
              const on = fai.ticked.includes(i)
              return (
                <button
                  key={c}
                  disabled={!!fai.signedBy}
                  onClick={() => update({ ...fai, ticked: on ? fai.ticked.filter((x) => x !== i) : [...fai.ticked, i] })}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${on ? 'border-run/50 bg-run/[0.07]' : 'border-line bg-panel-2'}`}
                >
                  {on ? <SquareCheck size={20} className="text-run" /> : <Square size={20} className="text-dim" />}
                  {c}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {fai.signedBy ? (
              <span className="flex items-center gap-1.5 text-run">
                <CheckCircle2 size={18} /> Signed by {fai.signedBy} at {clock(fai.signedAt!)}
              </span>
            ) : (
              <>
                <span className="text-sm text-dim">
                  {fai.ticked.length} of {CHECKS.length} checked
                </span>
                <Button variant="ok" disabled={!all} onClick={() => update({ ...fai, signedBy: 'Mei Ling (QC)', signedAt: now })}>
                  Sign off
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
