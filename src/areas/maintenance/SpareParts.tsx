import { AlertTriangle, Check, ShoppingCart } from 'lucide-react'
import { AppHeader, Button, Card } from '../../components/ui'
import { useAppState } from '../../sim/hooks'
import { PARTS } from './maintenanceData'

export function SpareParts() {
  const [ordered, setOrdered] = useAppState<string[]>('spares-ordered', () => [])
  const low = PARTS.filter((p) => p.stock <= p.reorder)

  return (
    <div>
      <AppHeader app="spare-parts">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 font-semibold ${low.length ? 'bg-idle/15 text-idle' : 'bg-run/15 text-run'}`}>
          <AlertTriangle size={16} /> {low.length} at or below reorder level
        </div>
      </AppHeader>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-dim uppercase">
            <tr className="border-b border-line text-left">
              <th className="py-2.5 pl-4 font-medium">Part</th>
              <th className="font-medium">Fits</th>
              <th className="font-medium">Where</th>
              <th className="text-right font-medium">In stock</th>
              <th className="text-right font-medium">Reorder at</th>
              <th className="pr-4 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {PARTS.map((p) => {
              const isLow = p.stock <= p.reorder
              const isOrdered = ordered.includes(p.code)
              return (
                <tr key={p.code} className={`border-b border-line/50 last:border-0 ${isLow && !isOrdered ? 'bg-idle/[0.06]' : ''}`}>
                  <td className="py-3 pl-4">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-dim">{p.code}</div>
                  </td>
                  <td>{p.fits}</td>
                  <td className="text-dim">{p.location}</td>
                  <td className={`tabular text-right text-lg font-bold ${isLow ? 'text-idle' : ''}`}>{p.stock}</td>
                  <td className="tabular text-right text-dim">{p.reorder}</td>
                  <td className="pr-4 text-right">
                    {isOrdered ? (
                      <span className="inline-flex items-center gap-1 text-run">
                        <Check size={15} /> Reorder sent
                      </span>
                    ) : isLow ? (
                      <Button variant="ghost" onClick={() => setOrdered((o) => [...o, p.code])}>
                        <ShoppingCart size={15} /> Reorder
                      </Button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
