import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppHeader, Button, Card, Stat } from '../../components/ui'
import { num, rm, shown } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { useChartColors } from '../../lib/theme'
import { useStore } from '../../sim/store'
import { HISTORY, seedSales, TYPES, type Sale } from './energyData'

export function ScrapRevenue() {
  const now = useStore((s) => s.simTime)
  const scrapParts = useStore((s) => s.machines.reduce((a, m) => a + (m.scrap * m.partWeightG) / 1000, 0))
  const [sales, setSales] = useAppState<Sale[]>('scrap-sales', () => seedSales(now))
  const c = useChartColors()
  const [type, setType] = useState('PP regrind')
  const [kg, setKg] = useState(150)

  const thisMonth = sales.reduce((a, s) => a + s.kg * s.rmPerKg, 0)
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(shown(now))
    d.setMonth(d.getMonth() - (11 - i))
    return { month: d.toLocaleDateString('en-GB', { month: 'short' }), rm: i === 11 ? Math.round(thisMonth) : HISTORY[i] }
  })

  return (
    <div>
      <AppHeader app="scrap-revenue" />
      <div className="mb-4 grid grid-cols-2 gap-4 @3xl:grid-cols-4">
        <Card>
          <Stat label="Sold this month" value={rm(thisMonth, 0)} />
        </Card>
        <Card>
          <Stat label="Weight sold" value={`${num(sales.reduce((a, s) => a + s.kg, 0))} kg`} />
        </Card>
        <Card>
          <Stat label="Last 12 months" value={rm(months.reduce((a, m) => a + m.rm, 0), 0)} />
        </Card>
        <Card>
          <Stat label="Scrap made today" value={`${num(scrapParts, 1)} kg`} sub="From the machine reject counts" />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-2 font-semibold">Scrap sold, RM per month</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="month" tick={{ fill: c.tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.grid }} />
                <YAxis tick={{ fill: c.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip cursor={{ fill: c.cursor }} contentStyle={c.tooltip} formatter={(v) => [rm(Number(v), 0), 'Sold']} />
                <Bar dataKey="rm" fill={c.info} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Record a sale</h2>
          <div className="grid grid-cols-[1fr_7rem] gap-3 text-sm">
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
              {Object.keys(TYPES).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input type="number" min={1} value={kg} onChange={(e) => setKg(Math.max(1, Number(e.target.value) || 1))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-dim">
              at RM {TYPES[type].toFixed(2)}/kg = <b className="text-ink">{rm(kg * TYPES[type])}</b>
            </span>
            <Button onClick={() => setSales([{ id: sales.length + 1, t: now, type, kg, rmPerKg: TYPES[type] }, ...sales])}>
              <Plus size={16} /> Record
            </Button>
          </div>
          <ul className="mt-4 text-sm">
            {sales.map((s) => (
              <li key={s.id} className="slide-in flex justify-between border-t border-line/50 py-2">
                <span>
                  {s.type} · {num(s.kg)} kg
                </span>
                <span className="tabular font-semibold">{rm(s.kg * s.rmPerKg)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
