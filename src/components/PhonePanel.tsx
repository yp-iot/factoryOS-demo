import { AlertTriangle, Bell, Check, CheckCircle2, Info, Signal, Wifi, X } from 'lucide-react'
import { useEffect } from 'react'
import { clock } from '../lib/format'
import { useSimNow } from '../sim/hooks'
import { decideClaim } from '../sim/ops'
import { useStore } from '../sim/store'
import type { PhoneMessage } from '../sim/types'

const TONE = {
  alert: { icon: AlertTriangle, color: 'text-stop', ring: 'border-stop/60' },
  info: { icon: Info, color: 'text-info', ring: 'border-line' },
  ok: { icon: CheckCircle2, color: 'text-run', ring: 'border-run/50' },
}

function Message({ m }: { m: PhoneMessage }) {
  const t = TONE[m.tone]
  const claim = useStore((s) => (m.claimId ? s.claims.find((c) => c.id === m.claimId) : undefined))
  return (
    <div className={`slide-in rounded-2xl border bg-white/[0.06] p-3 ${t.ring}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-dim">
        <Bell size={11} /> Factory alerts · to {m.to}
        <span className="ml-auto">{clock(m.t)}</span>
      </div>
      <div className="flex gap-2">
        <t.icon size={18} className={`mt-0.5 shrink-0 ${t.color}`} />
        <div>
          <div className="text-sm font-semibold">{m.title}</div>
          <div className="text-sm text-dim">{m.body}</div>
        </div>
      </div>
      {claim && claim.status === 'Waiting' && (
        <div className="mt-2 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => decideClaim(claim.id, false)} className="flex items-center justify-center gap-1 rounded-lg bg-stop/80 py-1.5 text-xs font-bold">
            <X size={14} /> Reject
          </button>
          <button onClick={() => decideClaim(claim.id, true)} className="flex items-center justify-center gap-1 rounded-lg bg-run py-1.5 text-xs font-bold text-black">
            <Check size={14} /> Approve
          </button>
        </div>
      )}
      {claim && claim.status !== 'Waiting' && <div className="mt-1 text-xs text-run">{claim.status} by {claim.approver}</div>}
    </div>
  )
}

/** A mock phone showing what the owner or technician receives. */
export function PhonePanel() {
  const open = useStore((s) => s.phoneOpen)
  const messages = useStore((s) => s.messages)
  const setOpen = useStore((s) => s.setPhoneOpen)
  const now = useSimNow(1000)
  if (!open) return null
  return (
    <aside className="flex w-80 shrink-0 flex-col items-center border-l border-line bg-panel px-4 py-4">
      <div className="mb-3 flex w-full items-center justify-between">
        <span className="text-sm font-semibold text-dim">Phone view</span>
        <button onClick={() => setOpen(false)} className="text-dim hover:text-ink" aria-label="Close phone view">
          <X size={18} />
        </button>
      </div>
      <div className="flex min-h-0 w-full max-w-[17rem] flex-1 flex-col rounded-[2.2rem] border-[6px] border-slate-700 bg-black p-2 shadow-2xl">
        <div className="relative flex items-center justify-between px-4 pt-1 pb-2 text-xs font-semibold">
          <span className="tabular">{clock(now)}</span>
          <span className="absolute left-1/2 top-1 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-800" />
          <span className="flex items-center gap-1">
            <Signal size={12} /> <Wifi size={12} />
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-[1.6rem] bg-gradient-to-b from-slate-900 to-slate-950 p-2.5">
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
        </div>
      </div>
    </aside>
  )
}

/** Phone-style notification that drops in at the top right. */
export function Toast() {
  const toast = useStore((s) => s.toast)
  const phoneOpen = useStore((s) => s.phoneOpen)
  const dismiss = useStore((s) => s.dismissToast)
  const setPhoneOpen = useStore((s) => s.setPhoneOpen)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismiss, 6000)
    return () => clearTimeout(t)
  }, [toast, dismiss])
  // With the phone open the message is already on its screen.
  if (!toast || phoneOpen) return null
  return (
    <div
      key={toast.id}
      role="button"
      onClick={() => {
        setPhoneOpen(true)
        dismiss()
      }}
      className="fixed top-20 right-6 z-50 w-80 cursor-pointer text-left"
    >
      <div className="rounded-2xl bg-slate-900 shadow-2xl shadow-black/60">
        <Message m={toast} />
      </div>
    </div>
  )
}
