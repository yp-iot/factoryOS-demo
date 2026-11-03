import { Send } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppHeader, Button, Card, StatusLight } from '../../components/ui'
import { clock, num } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { dayStart } from '../../sim/seed'
import { useStore } from '../../sim/store'

export function DailyProduction() {
  const machines = useStore((s) => s.machines)
  const now = useStore((s) => s.simTime)
  const notify = useStore((s) => s.notify)
  const [sentAt, setSentAt] = useAppState<number | null>('daily-sent', () => null)

  // Target so far = daily target × share of the 24-hour day already gone.
  const share = (now - dayStart(now)) / 86400000
  const rows = machines.map((m) => ({ m, target: Math.round(m.targetPerDay * share), pct: m.good / Math.max(1, m.targetPerDay * share) }))
  const totalGood = rows.reduce((a, r) => a + r.m.good, 0)
  const totalTarget = rows.reduce((a, r) => a + r.target, 0)
  const chart = rows.map((r) => ({ id: r.m.id, Actual: Math.round(r.pct * 100), Target: 100 }))

  return (
    <div>
      <AppHeader app="daily-production">
        <Button
          variant="ghost"
          onClick={() => {
            setSentAt(now)
            notify({ to: 'Owner', title: 'Daily production report', body: `${num(totalGood)} good parts by ${clock(now)}, ${Math.round((totalGood / totalTarget) * 100)}% of target so far.`, tone: 'info' }, { toast: true })
          }}
        >
          <Send size={16} /> {sentAt ? `Sent at ${clock(sentAt)}` : 'Send to owner’s phone'}
        </Button>
      </AppHeader>
      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-dim uppercase">
              <tr className="border-b border-line text-left">
                <th className="py-2.5 pl-4 font-medium">Machine</th>
                <th className="font-medium">Part</th>
                <th className="text-right font-medium">Target so far</th>
                <th className="text-right font-medium">Good parts</th>
                <th className="pr-4 text-right font-medium">vs target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, target, pct }) => (
                <tr key={m.id} className="border-b border-line/50">
                  <td className="py-3 pl-4">
                    <span className="flex items-center gap-2 font-bold">
                      <StatusLight status={m.status} size="sm" /> {m.id}
                    </span>
                  </td>
                  <td className="text-dim">{m.part}</td>
                  <td className="tabular text-right text-dim">{num(target)}</td>
                  <td className="tabular text-right font-semibold">{num(m.good)}</td>
                  <td className={`tabular pr-4 text-right font-bold ${pct >= 0.95 ? 'text-run' : pct >= 0.8 ? 'text-idle' : 'text-stop'}`}>{Math.round(pct * 100)}%</td>
                </tr>
              ))}
              <tr className="bg-panel-2 font-bold">
                <td className="py-3 pl-4" colSpan={2}>
                  Whole plant
                </td>
                <td className="tabular text-right">{num(totalTarget)}</td>
                <td className="tabular text-right">{num(totalGood)}</td>
                <td className="tabular pr-4 text-right">{Math.round((totalGood / totalTarget) * 100)}%</td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-3 text-xs text-dim">Filled in from the machine counters. Nobody types these numbers.</div>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">% of target so far</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="#24384e" />
                <XAxis dataKey="id" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#24384e' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" width={52} />
                <Tooltip cursor={{ fill: 'rgb(255 255 255 / 0.05)' }} contentStyle={{ background: '#12263c', border: '1px solid #24384e', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Target" fill="#334155" isAnimationActive={false} />
                <Bar dataKey="Actual" fill="#22c55e" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
