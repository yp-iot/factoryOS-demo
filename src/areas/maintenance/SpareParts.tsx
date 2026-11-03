import { AlertTriangle, Check, ShoppingCart } from 'lucide-react'
import { AppHeader, Button, Card } from '../../components/ui'
import { useAppState } from '../../sim/hooks'

const PARTS = [
  { code: 'SP-HB-220', name: 'Heater band 220 V, 60 mm', fits: 'M1–M6', stock: 3, reorder: 6, location: 'Cabinet A2' },
  { code: 'SP-TC-K', name: 'Thermocouple type K', fits: 'All', stock: 12, reorder: 8, location: 'Cabinet A2' },
  { code: 'SP-EP-6', name: 'Ejector pin 6 mm', fits: 'M3, M4', stock: 2, reorder: 10, location: 'Cabinet B1' },
  { code: 'SP-HF-10', name: 'Hydraulic filter 10 µm', fits: 'M2, M4, M6', stock: 4, reorder: 4, location: 'Shelf C' },
  { code: 'SP-NZ-M5', name: 'Nozzle tip', fits: 'M5', stock: 3, reorder: 2, location: 'Cabinet B1' },
  { code: 'SP-OR-KIT', name: 'O-ring kit, cooling lines', fits: 'All', stock: 9, reorder: 5, location: 'Cabinet B2' },
  { code: 'SP-PX-24', name: 'Proximity sensor 24 V', fits: 'P1', stock: 1, reorder: 2, location: 'Cabinet A1' },
  { code: 'SP-CB-16', name: 'Contactor 16 A', fits: 'All', stock: 5, reorder: 3, location: 'Cabinet A1' },
]

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
