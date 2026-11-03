import { AppHeader, Card, StatusLight } from '../../components/ui'
import { pct } from '../../lib/format'
import { oee, plantOee } from '../../sim/engine'
import { useStore } from '../../sim/store'

const tone = (v: number) => (v >= 0.85 ? '#22c55e' : v >= 0.65 ? '#f59e0b' : '#ef4444')

/** Half-circle gauge. */
function Gauge({ value }: { value: number }) {
  const r = 52
  const len = Math.PI * r
  return (
    <svg viewBox="0 0 120 70" className="w-full">
      <path d="M 8 62 A 52 52 0 0 1 112 62" fill="none" stroke="#24384e" strokeWidth="11" strokeLinecap="round" />
      <path
        d="M 8 62 A 52 52 0 0 1 112 62"
        fill="none"
        stroke={tone(value)}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${len * Math.min(1, value)} ${len}`}
        style={{ transition: 'stroke-dasharray 0.8s' }}
      />
      <text x="60" y="58" textAnchor="middle" fill="#e8edf6" fontSize="22" fontWeight="800">
        {Math.round(value * 100)}%
      </text>
    </svg>
  )
}

function Part({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-dim">{label}</span>
      <div className="h-1.5 flex-1 rounded bg-panel-2">
        <div className="h-full rounded" style={{ width: `${value * 100}%`, background: tone(value) }} />
      </div>
      <span className="tabular w-10 text-right">{pct(value)}</span>
    </div>
  )
}

export function OeePerMachine() {
  const machines = useStore((s) => s.machines)
  return (
    <div>
      <AppHeader app="oee">
        <div className="text-right">
          <div className="text-xs text-dim uppercase">Plant OEE today</div>
          <div className="tabular text-3xl font-bold">{pct(plantOee(machines))}</div>
        </div>
      </AppHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
        {machines.map((m) => {
          const o = oee(m)
          return (
            <Card key={m.id}>
              <div className="flex items-center gap-2">
                <StatusLight status={m.status} />
                <span className="text-xl font-black">{m.id}</span>
                <span className="truncate text-sm text-dim">{m.part}</span>
              </div>
              <div className="mx-auto max-w-44">
                <Gauge value={o.oee} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Part label="Availability" value={o.availability} />
                <Part label="Performance" value={o.performance} />
                <Part label="Quality" value={o.quality} />
              </div>
            </Card>
          )
        })}
        <Card className="text-sm text-dim">
          <div className="mb-1 font-semibold text-ink">How it is worked out</div>
          OEE = availability × performance × quality.
          <br />
          Availability: time running ÷ time planned.
          <br />
          Performance: parts made ÷ parts possible at the ideal cycle time.
          <br />
          Quality: good parts ÷ all parts.
        </Card>
      </div>
    </div>
  )
}
