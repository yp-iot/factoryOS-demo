import { AirVent, Leaf, Users } from 'lucide-react'
import { AppHeader, Card } from '../../components/ui'
import { num } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { useStore } from '../../sim/store'

const ZONES = [
  { name: 'Office', kW: 4.5, base: 8, phase: 0 },
  { name: 'QC room', kW: 2.5, base: 2, phase: 1.3 },
  { name: 'Meeting room', kW: 3.5, base: 0, phase: 2.1 },
  { name: 'Canteen', kW: 5, base: 0, phase: 3.4 },
  { name: 'Store office', kW: 2, base: 1, phase: 4.2 },
  { name: 'Server room', kW: 1.5, base: 0, phase: 0, always: true },
]

/** People in a zone, drifting through the day; a few rooms empty out. */
function occupancy(base: number, phase: number, t: number) {
  const wave = Math.sin(t / 1.9e6 + phase)
  return Math.max(0, Math.round(base + wave * 3))
}

export function AirconSaving() {
  const now = useStore((s) => s.simTime)
  const rate = useStore((s) => s.ratePerKWh)
  const [saving, setSaving] = useAppState('aircon-saving', () => false)

  const zones = ZONES.map((z) => {
    const people = z.always ? 0 : occupancy(z.base, z.phase, now)
    const on = z.always || !saving || people > 0
    const setpoint = saving && !z.always ? 25 : 23
    const temp = on ? setpoint + Math.sin(now / 7e5 + z.phase) * 0.4 : 27.5 + Math.sin(now / 9e5 + z.phase) * 0.5
    return { ...z, people, on, setpoint, temp }
  })
  // Estimate for a 10-hour working day: empty rooms off, and roughly 6% less per degree raised.
  const normalKWh = ZONES.reduce((a, z) => a + z.kW * 10, 0)
  const savingKWh = zones.reduce((a, z) => a + (z.on ? z.kW * 10 * (z.always ? 1 : 0.88) : z.kW * 10 * 0.35), 0)
  const diff = normalKWh - savingKWh

  return (
    <div>
      <AppHeader app="aircon">
        <button
          onClick={() => setSaving(!saving)}
          className={`flex items-center gap-3 rounded-full border px-4 py-2 font-semibold ${saving ? 'border-run bg-run/15 text-run' : 'border-line text-dim'}`}
        >
          <Leaf size={18} /> Saving mode
          <span className={`relative h-6 w-11 rounded-full ${saving ? 'bg-run' : 'bg-line'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${saving ? 'left-5.5' : 'left-0.5'}`} />
          </span>
        </button>
      </AppHeader>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {zones.map((z) => (
          <Card key={z.name} className={z.on ? '' : 'opacity-70'}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{z.name}</span>
              <span className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-bold ${z.on ? 'bg-info/15 text-info' : 'bg-slate-500/20 text-dim'}`}>
                <AirVent size={13} /> {z.on ? `ON · ${z.setpoint}°C` : 'OFF'}
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="tabular text-4xl font-bold">{num(z.temp, 1)}°</div>
                <div className="text-xs text-dim">Room now</div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-2xl font-bold">
                  <Users size={20} className="text-dim" /> {z.always ? '—' : z.people}
                </div>
                <div className="text-xs text-dim">{z.always ? 'Always on' : z.people ? 'People in room' : 'Empty'}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className={`mt-4 flex items-center gap-6 ${saving ? 'border-run/50' : ''}`}>
        <Leaf size={28} className={saving ? 'text-run' : 'text-dim'} />
        <div className="flex-1">
          <div className="text-xs text-dim uppercase">Estimated difference for today</div>
          <div className="tabular text-3xl font-bold">
            {saving ? `${num(diff)} kWh · about RM ${num(diff * rate, 2)}` : 'Turn on saving mode to see the estimate'}
          </div>
        </div>
        <div className="max-w-sm text-sm text-dim">
          Estimate only. Saving mode switches off empty rooms and raises the setpoint by 2°C. Real figures depend on the building and the weather.
        </div>
      </Card>
    </div>
  )
}
