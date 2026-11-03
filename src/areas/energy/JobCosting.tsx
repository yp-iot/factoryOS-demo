import { AppHeader, Card } from '../../components/ui'
import { num, rm } from '../../lib/format'
import { statusOf } from '../../sim/orders'
import { useStore } from '../../sim/store'

// Demo assumptions, shown on screen.
const RESIN_RM_PER_KG = { pp: 6.2, abs: 9.8 }
const MACHINE_RM_PER_HOUR = 28 // labour, depreciation and overheads per machine hour

export function JobCosting() {
  const orders = useStore((s) => s.workOrders).filter((o) => o.made > 0)
  const machines = useStore((s) => s.machines)
  const rate = useStore((s) => s.ratePerKWh)

  const rows = orders.map((o) => {
    const m = machines.find((x) => x.id === o.machineId)!
    const hours = ((o.made / (1 - m.scrapRate) / m.cavities) * m.idealCycleS * 1.04) / 3600
    const material = ((o.made / (1 - m.scrapRate)) * m.partWeightG * RESIN_RM_PER_KG[m.material]) / 1000
    const machine = hours * MACHINE_RM_PER_HOUR
    const energy = hours * m.runKW * rate
    const cost = material + machine + energy
    const revenue = o.made * o.pricePerPart
    return { o, hours, material, machine, energy, cost, revenue, margin: revenue > 0 ? (revenue - cost) / revenue : 0 }
  })

  return (
    <div>
      <AppHeader app="job-costing" />
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-dim uppercase">
            <tr className="border-b border-line text-left">
              <th className="py-2.5 pl-4 font-medium">Order</th>
              <th className="text-right font-medium">Made</th>
              <th className="text-right font-medium">Material</th>
              <th className="text-right font-medium">Machine time</th>
              <th className="text-right font-medium">Power</th>
              <th className="text-right font-medium">Cost / part</th>
              <th className="text-right font-medium">Price / part</th>
              <th className="w-44 pr-4 text-right font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, hours, material, machine, energy, cost, margin }) => (
              <tr key={o.id} className="border-b border-line/50 last:border-0">
                <td className="py-3 pl-4">
                  <div className="font-semibold">
                    {o.id} · {o.machineId}
                  </div>
                  <div className="text-xs text-dim">
                    {o.part} · {statusOf(o) === 'done' ? 'done' : 'so far'}
                  </div>
                </td>
                <td className="tabular text-right">{num(o.made)}</td>
                <td className="tabular text-right">{rm(material)}</td>
                <td className="tabular text-right">
                  {rm(machine)}
                  <div className="text-xs text-dim">{num(hours, 1)} h</div>
                </td>
                <td className="tabular text-right">{rm(energy)}</td>
                <td className="tabular text-right font-semibold">{rm(cost / o.made, 3)}</td>
                <td className="tabular text-right">{rm(o.pricePerPart, 3)}</td>
                <td className="pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-20 rounded bg-panel-2">
                      <div className={`h-full rounded ${margin >= 0.2 ? 'bg-run' : margin >= 0 ? 'bg-idle' : 'bg-stop'}`} style={{ width: `${Math.max(0, Math.min(1, margin)) * 100}%` }} />
                    </div>
                    <span className={`tabular w-12 text-right font-bold ${margin < 0 ? 'text-stop' : ''}`}>{Math.round(margin * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-3 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-dim">
        Demo assumptions: PP resin RM {RESIN_RM_PER_KG.pp.toFixed(2)}/kg, ABS RM {RESIN_RM_PER_KG.abs.toFixed(2)}/kg, machine time RM {MACHINE_RM_PER_HOUR}/hour, power RM{' '}
        {rate.toFixed(2)}/kWh. Selling prices are sample figures. Costs update as the machines run.
      </div>
    </div>
  )
}
