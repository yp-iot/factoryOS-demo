import { Check, Send, Signal, Wifi, X } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, dateTime } from '../../lib/format'
import { approver, decideClaim, submitClaim } from '../../sim/ops'
import { useStore } from '../../sim/store'
import type { Claim } from '../../sim/types'

const CHIP: Record<Claim['status'], string> = {
  Waiting: 'bg-idle/15 text-idle',
  Approved: 'bg-run/15 text-run',
  Rejected: 'bg-stop/15 text-stop',
}

export function EClaim() {
  const claims = useStore((s) => s.claims)
  const now = useStore((s) => s.simTime)
  const onLeave = useStore((s) => s.supervisorOnLeave)
  const [worker, setWorker] = useState('Siti')
  const [kind, setKind] = useState<Claim['kind']>('Overtime')
  const [detail, setDetail] = useState('Today, 2 h after shift A, M3 restart')
  const [amount, setAmount] = useState('2.0 h')
  const waiting = claims.filter((c) => c.status === 'Waiting')
  // With the phone view open, approvals show there; no need for a second phone.
  const phoneOpen = useStore((s) => s.phoneOpen)

  return (
    <div>
      <AppHeader app="e-claim" />
      <div className={`grid gap-4 ${phoneOpen ? 'grid-cols-1' : 'grid-cols-1 @4xl:grid-cols-[minmax(0,1fr)_17rem]'}`}>
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-3 font-semibold">1 · Submit</h2>
            <div className="grid grid-cols-2 items-end gap-3 text-sm @5xl:grid-cols-[8rem_9rem_1fr_7rem_auto]">
              <label className="flex flex-col gap-1">
                <span className="text-dim">Worker</span>
                <select value={worker} onChange={(e) => setWorker(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
                  {['Siti', 'Raju', 'Ah Kow', 'Farah', 'Daniel', 'Aminah'].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-dim">Type</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as Claim['kind'])} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
                  <option>Overtime</option>
                  <option>Meal claim</option>
                  <option>Mileage</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-dim">Details</span>
                <input value={detail} onChange={(e) => setDetail(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-dim">Amount</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
              </label>
              <Button disabled={!detail.trim() || !amount.trim()} onClick={() => submitClaim({ worker, kind, detail: detail.trim(), amount: amount.trim() })}>
                <Send size={16} /> Submit
              </Button>
            </div>
            <div className="mt-2 text-xs text-dim">
              Goes to <b className="text-ink">{approver()}</b>
              {onLeave && ' (backup, supervisor on leave)'} for approval.
            </div>
          </Card>
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-dim uppercase">
                <tr className="border-b border-line text-left">
                  <th className="py-2.5 pl-4 font-medium">Claim</th>
                  <th className="font-medium">Worker</th>
                  <th className="font-medium">Details</th>
                  <th className="font-medium">Amount</th>
                  <th className="pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="slide-in border-b border-line/50 last:border-0">
                    <td className="py-2.5 pl-4">
                      <div className="font-semibold">{c.id}</div>
                      <div className="text-xs text-dim">{dateTime(c.t)}</div>
                    </td>
                    <td>{c.worker}</td>
                    <td>
                      <div>{c.kind}</div>
                      <div className="text-xs text-dim">{c.detail}</div>
                    </td>
                    <td className="tabular">{c.amount}</td>
                    <td className="pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${CHIP[c.status]}`}>{c.status === 'Approved' ? 'Done' : c.status}</span>
                      {c.approver && <div className="text-xs text-dim">by {c.approver}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* 2 · Approve, on the approver's phone */}
        {!phoneOpen && (
        <div data-theme="dark" className="mx-auto flex h-[32rem] w-full max-w-[16rem] flex-col rounded-[2rem] text-ink border-[6px] border-slate-700 bg-black p-2">
          <div className="flex items-center justify-between px-3 pb-2 text-xs font-semibold">
            <span className="tabular">{clock(now)}</span>
            <span className="flex gap-1">
              <Signal size={12} /> <Wifi size={12} />
            </span>
          </div>
          <div className="flex-1 overflow-y-auto rounded-[1.5rem] bg-gradient-to-b from-slate-900 to-slate-950 p-2.5">
            <div className="mb-2 px-1 text-sm font-semibold">2 · Approve · {approver()}</div>
            {waiting.length === 0 && <div className="px-1 text-sm text-dim">Nothing waiting.</div>}
            {waiting.map((c) => (
              <div key={c.id} className="slide-in mb-2 rounded-xl bg-white/[0.07] p-2.5 text-sm">
                <div className="font-semibold">
                  {c.kind} · {c.worker}
                </div>
                <div className="text-xs text-dim">{c.detail}</div>
                <div className="tabular mt-1 text-lg font-bold">{c.amount}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => decideClaim(c.id, false)} className="flex items-center justify-center gap-1 rounded-lg bg-stop/80 py-1.5 text-xs font-bold">
                    <X size={14} /> Reject
                  </button>
                  <button onClick={() => decideClaim(c.id, true)} className="flex items-center justify-center gap-1 rounded-lg bg-run py-1.5 text-xs font-bold text-black">
                    <Check size={14} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
