import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppHeader, Card } from '../../components/ui'
import { clock, num, pct } from '../../lib/format'
import { takeFlag } from '../../sim/ops'
import { useStore } from '../../sim/store'
import type { Defect } from '../../sim/types'

const W = 640
const H = 260
const CHECK_X = 380 // where the camera looks
const TRAVEL_MS = 6000
const SPAWN_MS = 1100

interface Part {
  id: number
  born: number
  defect: Defect | null
}

/** A drawn wall switch cover, with the defect painted on. */
function SwitchCover({ x, defect }: { x: number; defect: Defect | null }) {
  const y = 105
  return (
    <g transform={`translate(${x} ${y})`}>
      {defect === 'Short shot' ? (
        <path d="M0 6 Q0 0 6 0 H44 L60 18 V54 Q60 60 54 60 H6 Q0 60 0 54 Z" fill="#cbd5e1" />
      ) : (
        <rect width="60" height="60" rx="6" fill="#e2e8f0" />
      )}
      <rect x="18" y="14" width="24" height="32" rx="3" fill="#94a3b8" />
      {defect === 'Flash' && <path d="M60 10 L68 14 L60 22" stroke="#e2e8f0" strokeWidth="2" fill="none" />}
      {defect === 'Sink mark' && <ellipse cx="12" cy="48" rx="7" ry="4" fill="#64748b" />}
      {defect === 'Black spot' && (
        <>
          <circle cx="50" cy="44" r="2.5" fill="#0f172a" />
          <circle cx="45" cy="50" r="1.8" fill="#0f172a" />
        </>
      )}
      {defect === 'Warpage' && <path d="M0 58 Q30 66 60 58" stroke="#475569" strokeWidth="2" fill="none" />}
    </g>
  )
}

export function AiCamera() {
  const camera = useStore((s) => s.camera)
  const m5 = useStore((s) => s.machines.find((m) => m.id === 'M5')!)
  const speed = useStore((s) => s.speed)
  const moving = speed > 0 && m5.status === 'run'

  const [parts, setParts] = useState<Part[]>([])
  const [conveyor, setConveyor] = useState(0) // conveyor time in ms; freezes when the line stops
  const clockRef = useRef(0)
  const idRef = useRef(0)

  // Animate the conveyor; spawn a part every SPAWN_MS of conveyor time.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let nextSpawn = clockRef.current
    const loop = (t: number) => {
      const dt = t - last
      last = t
      if (moving) {
        clockRef.current += dt
        if (clockRef.current >= nextSpawn) {
          nextSpawn = clockRef.current + SPAWN_MS
          const flag = useStore.getState().camera.flagging[0] ?? null
          if (flag) takeFlag()
          setParts((ps) => [...ps.filter((p) => clockRef.current - p.born < TRAVEL_MS), { id: ++idRef.current, born: clockRef.current, defect: flag }])
        }
      }
      setConveyor(clockRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [moving])

  const total = camera.good + camera.reject
  const rejects = [...camera.recent].reverse()

  return (
    <div>
      <AppHeader app="ai-camera" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,1fr)_17rem]">
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Camera size={16} className="text-accent" /> Camera 1 · M5 · Wall switch cover
            <span className="ml-auto text-xs text-dim">{moving ? 'Inspecting' : 'Line stopped'}</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-[#0a1a2c]">
            {/* conveyor */}
            <rect x="0" y="90" width={W} height="90" fill="#16304a" />
            {Array.from({ length: 17 }, (_, i) => {
              const off = ((conveyor / 25) % 40) - 40
              return <rect key={i} x={i * 40 + off} y="176" width="20" height="4" fill="#334155" />
            })}
            {/* camera field of view */}
            <path d={`M${CHECK_X - 10} 0 L${CHECK_X - 55} 90 H${CHECK_X + 115} L${CHECK_X + 70} 0 Z`} fill="rgb(56 189 248 / 0.06)" />
            <rect x={CHECK_X - 12} y="0" width="84" height="18" rx="4" fill="#334155" />
            <circle cx={CHECK_X + 30} cy="9" r="5" fill="#38bdf8" />
            {parts.map((p) => {
              const x = ((conveyor - p.born) / TRAVEL_MS) * (W + 80) - 70
              const seen = x + 30 >= CHECK_X
              const pushed = p.defect && x > CHECK_X + 90
              return (
                <g key={p.id} opacity={pushed ? Math.max(0, 1 - (x - CHECK_X - 90) / 60) : 1} transform={pushed ? `translate(0 ${(x - CHECK_X - 90) * 0.8})` : undefined}>
                  <SwitchCover x={x} defect={p.defect} />
                  {seen && (
                    <>
                      <rect x={x - 6} y="99" width="72" height="72" fill="none" stroke={p.defect ? '#ef4444' : '#22c55e'} strokeWidth="2.5" rx="4" />
                      <rect x={x - 6} y="80" width={p.defect ? 92 : 40} height="17" rx="3" fill={p.defect ? '#ef4444' : '#22c55e'} />
                      <text x={x} y="92" fontSize="11" fontWeight="700" fill="#0b1f33">
                        {p.defect ? `${p.defect.toUpperCase()}` : 'OK'}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
            <text x="10" y={H - 12} fontSize="11" fill="#64748b">
              Drawn simulation · no real images
            </text>
          </svg>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-dim uppercase">Good</div>
                <div className="tabular text-3xl font-bold text-run">{num(camera.good)}</div>
              </div>
              <div>
                <div className="text-xs text-dim uppercase">Rejected</div>
                <div className="tabular text-3xl font-bold text-stop" key={camera.reject}>
                  {num(camera.reject)}
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm text-dim">Reject rate {pct(camera.reject / Math.max(1, total), 1)}</div>
          </Card>
          <Card className="p-0">
            <div className="px-4 pt-3 pb-1 text-sm font-semibold">Last 10 rejects</div>
            <ul className="text-sm">
              {rejects.map((r) => (
                <li key={r.id} className="slide-in flex justify-between border-t border-line/50 px-4 py-1.5">
                  <span>{r.defect}</span>
                  <span className="tabular text-dim">{clock(r.t, true)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
