import { CheckCircle2, ScanLine, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { num } from '../../lib/format'
import { setDo } from '../../sim/ops'
import { useStore } from '../../sim/store'
import { DO_SAMPLES, saveDo, type DoSample } from './doSamples'

const READ_MS = 3200

/** A drawn paper delivery order. Fictional supplier, no real photo. */
function DoPaper({ d, scanning = false }: { d: DoSample; scanning?: boolean }) {
  return (
    <svg viewBox="0 0 300 380" className="w-full rounded-md shadow-lg shadow-black/40">
      <rect width="300" height="380" fill="#f8f5ee" />
      <text x="16" y="30" fontSize="14" fontWeight="800" fill="#16304a">{d.supplier}</text>
      <text x="16" y="44" fontSize="7" fill="#64748b">{d.address}</text>
      <rect x="196" y="16" width="88" height="34" fill="none" stroke="#16304a" />
      <text x="202" y="29" fontSize="8" fontWeight="700" fill="#16304a">DELIVERY ORDER</text>
      <text x="202" y="43" fontSize="9" fill="#16304a">No: {d.doNo}</text>
      <text x="16" y="70" fontSize="8" fill="#334155">Deliver to: Demo Plastics Sdn Bhd</text>
      <text x="16" y="82" fontSize="8" fill="#334155">Date: {d.date}    Lorry: {d.lorry}</text>
      <rect x="16" y="94" width="268" height="16" fill="#e2e8f0" />
      {['Code', 'Description', 'Packing', 'Qty'].map((h, i) => (
        <text key={h} x={[20, 70, 170, 250][i]} y="105" fontSize="7.5" fontWeight="700" fill="#16304a">
          {h}
        </text>
      ))}
      {d.lines.map((l, i) => (
        <g key={l.code} transform={`translate(0 ${122 + i * 20})`}>
          <text x="20" y="0" fontSize="7.5" fill="#16304a">{l.code}</text>
          <text x="70" y="0" fontSize="7.5" fill="#16304a">{l.desc}</text>
          <text x="170" y="0" fontSize="7.5" fill="#16304a">{l.packs}</text>
          <text x="250" y="0" fontSize="7.5" fill="#16304a">{num(l.qty)}</text>
          <line x1="16" x2="284" y1="7" y2="7" stroke="#cbd5e1" />
        </g>
      ))}
      <text x="16" y="320" fontSize="7" fill="#64748b">Received in good order and condition</text>
      <path d="M30 350 q10 -14 20 0 t20 0 t18 -6" stroke="#1d4ed8" fill="none" strokeWidth="1.5" />
      <line x1="16" x2="120" y1="358" y2="358" stroke="#94a3b8" />
      <text x="190" y="358" fontSize="7" fill="#64748b">Company stamp</text>
      <circle cx="230" cy="335" r="16" fill="none" stroke="#dc2626" strokeOpacity="0.5" strokeWidth="2" />
      {scanning && (
        <rect width="300" height="6" fill="rgb(56 189 248 / 0.55)">
          <animate attributeName="y" values="0;374;0" dur="1.6s" repeatCount="indefinite" />
        </rect>
      )}
    </svg>
  )
}

export function AiReadsDo() {
  const stage = useStore((s) => s.doStage)
  const sample = useStore((s) => s.doSample)
  const grns = useStore((s) => s.grns)
  const materials = useStore((s) => s.materials)
  const [picking, setPicking] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const [qtys, setQtys] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const d = DO_SAMPLES[sample]
  const fields = 3 + d.lines.length // supplier, DO no, lorry, then one per line

  // Fill the fields one by one, then hand over for a human check.
  useEffect(() => {
    if (stage !== 'reading') return
    const t = setInterval(() => setRevealed((r) => r + 1), READ_MS / fields)
    const done = setTimeout(() => setDo('check'), READ_MS)
    return () => {
      clearInterval(t)
      clearTimeout(done)
    }
  }, [stage, fields])

  const start = (i: number) => {
    setPicking(false)
    setRevealed(0)
    setChecked(false)
    setQtys(DO_SAMPLES[i].lines.map((l) => l.qty))
    setDo('reading', i)
  }
  const shown = stage === 'reading' ? revealed : fields
  const lineQty = (i: number) => qtys[i] ?? d.lines[i].qty
  const mat = (id: string) => materials.find((m) => m.id === id)!

  if (stage === 'idle') {
    return (
      <div>
        <AppHeader app="ai-do" />
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <ScanLine size={40} className="text-accent" />
          <div className="text-xl font-semibold">Snap the delivery order. The AI fills in the GRN.</div>
          <div className="text-dim">A person always checks before anything is saved.</div>
          {!picking ? (
            <Button onClick={() => setPicking(true)} className="px-6 py-3 text-base">
              <Upload size={18} /> Upload DO
            </Button>
          ) : (
            <div className="grid w-full max-w-3xl grid-cols-3 gap-4">
              {DO_SAMPLES.map((s, i) => (
                <button key={s.doNo} onClick={() => start(i)} className="rounded-lg border border-line p-2 text-left hover:border-accent">
                  <DoPaper d={s} />
                  <div className="mt-2 text-sm font-semibold">{s.doNo}</div>
                  <div className="text-xs text-dim">{s.supplier}</div>
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-dim">Sample delivery orders are drawn for this demo. Suppliers are fictional.</div>
        </Card>
      </div>
    )
  }

  const field = (i: number, label: string, value: string) => (
    <div key={label} className="flex items-center gap-3 border-b border-line/50 py-2">
      <span className="w-28 text-sm text-dim">{label}</span>
      {i < shown ? <span className="slide-in font-semibold">{value}</span> : <span className="h-4 w-32 animate-pulse rounded bg-panel-2" />}
    </div>
  )

  return (
    <div>
      <AppHeader app="ai-do" />
      <div className="grid grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-4">
        <Card className="p-3">
          <DoPaper d={d} scanning={stage === 'reading'} />
        </Card>
        <Card>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles size={16} /> {stage === 'reading' ? 'Reading the delivery order…' : 'GRN filled from the delivery order'}
          </div>
          {field(0, 'Supplier', d.supplier)}
          {field(1, 'DO number', d.doNo)}
          {field(2, 'Lorry', d.lorry)}
          {d.lines.map((l, i) => (
            <div key={l.code} className="flex items-center gap-3 border-b border-line/50 py-2">
              <span className="w-28 text-sm text-dim">Item {i + 1}</span>
              {3 + i < shown ? (
                <span className="slide-in flex flex-1 items-center gap-2">
                  <span className="flex-1 font-semibold">{mat(l.material).name}</span>
                  {stage === 'check' ? (
                    <input
                      type="number"
                      value={lineQty(i)}
                      onChange={(e) => setQtys(d.lines.map((_, k) => (k === i ? Math.max(0, Number(e.target.value) || 0) : lineQty(k))))}
                      className="tabular w-28 rounded-lg border border-accent/60 bg-panel-2 px-2 py-1 text-right font-semibold"
                    />
                  ) : (
                    <span className="tabular font-semibold">{num(lineQty(i))}</span>
                  )}
                  <span className="w-8 text-sm text-dim">{mat(l.material).unit}</span>
                </span>
              ) : (
                <span className="h-4 w-48 animate-pulse rounded bg-panel-2" />
              )}
            </div>
          ))}

          {stage === 'check' && (
            <div className="slide-in mt-4 rounded-lg border border-idle/60 bg-idle/10 p-3">
              <div className="flex items-center gap-2 font-semibold text-idle">
                <ShieldCheck size={18} /> Check before saving
              </div>
              <div className="mt-1 text-sm">Compare each line with the paper DO and the goods on the lorry. Fix any quantity that is wrong.</div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                I checked it against the paper DO
              </label>
              <div className="mt-3 flex justify-end">
                <Button variant="ok" disabled={!checked} onClick={() => saveDo(sample, d.lines.map((l, i) => ({ ...l, qty: lineQty(i) })))}>
                  Save GRN
                </Button>
              </div>
            </div>
          )}

          {stage === 'saved' && (
            <div className="slide-in mt-4 flex items-center gap-3 rounded-lg border border-run/50 bg-run/10 p-3">
              <CheckCircle2 className="text-run" />
              <div className="flex-1">
                <div className="font-semibold">Saved as {grns[0].id}. Stock is updated.</div>
                <div className="text-sm text-dim">
                  {grns[0].lines.map((l) => `${mat(l.material).name} +${num(l.qty)} ${mat(l.material).unit}`).join(' · ')}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setDo('idle')}>
                Read another
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
