import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, date } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { statusOf } from '../../sim/orders'
import { useStore } from '../../sim/store'

interface Inspection {
  batch: string
  wo: string
  part: string
  sample: number
  defects: number
  pass: boolean
  t: number
}

// Pass rate for the last 7 days, oldest first.
const WEEK = [96, 94, 97, 92, 95, 98, 96]

function seed(now: number): Inspection[] {
  const h = 3600000
  return [
    { batch: 'B-2207', wo: 'WO-1102', part: 'Food container lid', sample: 50, defects: 0, pass: true, t: now - 0.5 * h },
    { batch: 'B-2206', wo: 'WO-1101', part: 'Bottle cap 28 mm', sample: 80, defects: 1, pass: true, t: now - 1.2 * h },
    { batch: 'B-2205', wo: 'WO-1105', part: 'Wall switch cover', sample: 50, defects: 4, pass: false, t: now - 1.8 * h },
    { batch: 'B-2204', wo: 'WO-1103', part: 'Switch box housing', sample: 32, defects: 0, pass: true, t: now - 2.3 * h },
  ]
}

export function FinalQc() {
  const now = useStore((s) => s.simTime)
  const orders = useStore((s) => s.workOrders).filter((o) => ['running', 'qc'].includes(statusOf(o)))
  const [list, setList] = useAppState<Inspection[]>('final-qc', () => seed(useStore.getState().simTime))
  const [wo, setWo] = useState(orders[0]?.id ?? '')
  const [sample, setSample] = useState(50)
  const [defects, setDefects] = useState(0)

  const todayRate = Math.round((list.filter((i) => i.pass).length / list.length) * 100)
  const chart = [...WEEK.map((v, i) => ({ day: date(now - (7 - i) * 86400000).split(' ')[0], rate: v })), { day: 'Today', rate: todayRate }]

  const record = (pass: boolean) => {
    const o = orders.find((x) => x.id === wo)
    if (!o) return
    const n = Math.max(...list.map((i) => Number(i.batch.split('-')[1]))) + 1
    setList([{ batch: `B-${n}`, wo, part: o.part, sample, defects, pass, t: now }, ...list])
    setDefects(0)
  }

  return (
    <div>
      <AppHeader app="final-qc" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Inspect a batch</h2>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-dim">Work order</span>
              <select value={wo} onChange={(e) => setWo(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} · {o.part}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-dim">Sample size</span>
                <input type="number" min={1} value={sample} onChange={(e) => setSample(Math.max(1, Number(e.target.value) || 1))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-dim">Defects found</span>
                <input type="number" min={0} value={defects} onChange={(e) => setDefects(Math.max(0, Number(e.target.value) || 0))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ok" onClick={() => record(true)}>
                <Check size={16} /> Pass
              </Button>
              <Button variant="danger" onClick={() => record(false)}>
                <X size={16} /> Fail
              </Button>
            </div>
          </div>
        </Card>
        <Card>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Pass rate by day</h2>
            <span className="tabular text-2xl font-bold">{todayRate}% today</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="#253049" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#253049' }} />
                <YAxis domain={[60, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" width={52} />
                <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Goal 95%', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
                <Bar dataKey="rate" isAnimationActive={false}>
                  {chart.map((d) => (
                    <Cell key={d.day} fill={d.day === 'Today' ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card className="mt-4 p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-dim uppercase">
            <tr className="border-b border-line text-left">
              <th className="py-2.5 pl-4 font-medium">Batch</th>
              <th className="font-medium">Order</th>
              <th className="font-medium">Part</th>
              <th className="text-right font-medium">Sample</th>
              <th className="text-right font-medium">Defects</th>
              <th className="font-medium">&nbsp;Time</th>
              <th className="pr-4 text-right font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.batch} className="slide-in border-b border-line/50 last:border-0">
                <td className="py-2.5 pl-4 font-semibold">{i.batch}</td>
                <td>{i.wo}</td>
                <td className="text-dim">{i.part}</td>
                <td className="tabular text-right">{i.sample}</td>
                <td className="tabular text-right">{i.defects}</td>
                <td className="text-dim">&nbsp;{clock(i.t)}</td>
                <td className="pr-4 text-right">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${i.pass ? 'bg-run/15 text-run' : 'bg-stop/15 text-stop'}`}>{i.pass ? 'PASS' : 'FAIL'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
