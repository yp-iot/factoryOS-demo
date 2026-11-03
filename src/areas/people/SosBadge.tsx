import { BellRing, CheckCircle2, Siren } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, duration } from '../../lib/format'
import { useSimNow } from '../../sim/hooks'
import { clearSos, raiseSos } from '../../sim/ops'
import { FLOOR_WORKERS, FLOOR_ZONES } from '../../sim/seedOps'
import { useStore } from '../../sim/store'

export function SosBadge() {
  const sos = useStore((s) => s.sos)
  const now = useSimNow(500)
  const [tester, setTester] = useState('Raju')
  const active = sos.find((a) => a.cleared === null)

  return (
    <div>
      <AppHeader app="sos">
        <div className="flex items-center gap-2 text-sm">
          <select value={tester} onChange={(e) => setTester(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
            {FLOOR_WORKERS.map((w) => (
              <option key={w.name}>{w.name}</option>
            ))}
          </select>
          <Button variant="danger" disabled={!!active} onClick={() => raiseSos(tester)}>
            <Siren size={16} /> Test an SOS
          </Button>
        </div>
      </AppHeader>

      {active && (
        <Card className="alarm slide-in mb-4 flex items-center gap-4 border-stop bg-stop/15">
          <BellRing size={32} className="text-stop" />
          <div className="flex-1">
            <div className="text-2xl font-black text-stop">SOS · {active.worker}</div>
            <div className="text-lg">{active.zone}</div>
            <div className="text-sm text-dim">
              Pressed at {clock(active.t, true)} · {duration((now - active.t) / 1000)} ago · alert sent to supervisor and first aiders
            </div>
          </div>
          <Button variant="ok" onClick={() => clearSos(active.id)} className="px-5 py-3 text-base">
            <CheckCircle2 size={18} /> Help is there
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_16rem] gap-4">
        <Card className="p-3">
          <svg viewBox="0 0 100 62" className="w-full">
            <rect width="100" height="62" fill="#0a1a2c" rx="1.5" />
            {FLOOR_ZONES.map((z) => (
              <g key={z.id}>
                <rect
                  x={z.x}
                  y={z.y * 0.6}
                  width={z.w}
                  height={z.h * 0.6}
                  rx="0.8"
                  fill={active && active.zone === z.name ? 'rgb(239 68 68 / 0.18)' : '#15293f'}
                  stroke={active && active.zone === z.name ? '#ef4444' : '#24384e'}
                  strokeWidth="0.3"
                />
                <text x={z.x + 1.2} y={z.y * 0.6 + 2.6} fontSize="1.7" fill="#64748b">
                  {z.name}
                </text>
              </g>
            ))}
            {FLOOR_WORKERS.map((w, i) => {
              const alarm = active?.worker === w.name
              // Drift a little so the badges look live; the alarmed one holds still.
              const dx = alarm ? 0 : Math.sin(now / 9000 + i) * 1.4
              const dy = alarm ? 0 : Math.cos(now / 11000 + i * 1.7) * 1.1
              const cx = w.x + dx
              const cy = w.y * 0.6 + dy
              return (
                <g key={w.name}>
                  {alarm && (
                    <circle cx={cx} cy={cy} r="2" fill="none" stroke="#ef4444" strokeWidth="0.4">
                      <animate attributeName="r" values="1.5;5;1.5" dur="1.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={cx} cy={cy} r={alarm ? 1.4 : 1} fill={alarm ? '#ef4444' : '#22c55e'} />
                  <text x={cx + 1.6} y={cy + 0.6} fontSize={alarm ? 2 : 1.5} fill={alarm ? '#fecaca' : '#94a3b8'} fontWeight={alarm ? 700 : 400}>
                    {w.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </Card>
        <Card>
          <div className="mb-1 text-xs text-dim uppercase">On the floor</div>
          <div className="tabular text-3xl font-bold">{FLOOR_WORKERS.length} badges</div>
          <div className="mb-4 text-sm text-dim">Location updates every few seconds</div>
          <div className="mb-1 text-sm font-semibold">Alert history</div>
          {sos.length === 0 && <div className="text-sm text-dim">No alerts today.</div>}
          <ul className="text-sm">
            {sos.map((a) => (
              <li key={a.id} className="slide-in border-t border-line/50 py-2">
                <div className="flex justify-between">
                  <b>{a.worker}</b>
                  <span className="text-dim">{clock(a.t)}</span>
                </div>
                <div className="text-xs text-dim">
                  {a.zone} · {a.cleared ? `cleared in ${Math.max(1, Math.round((a.cleared - a.t) / 60000))} min` : 'active'}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
