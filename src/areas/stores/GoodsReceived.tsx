import { PackagePlus, Sparkles, Truck } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock, dateTime, num } from '../../lib/format'
import { receiveGrn } from '../../sim/ops'
import { useStore } from '../../sim/store'
import type { MaterialId } from '../../sim/types'

export function GoodsReceived() {
  const grns = useStore((s) => s.grns)
  const materials = useStore((s) => s.materials)
  const lorries = useStore((s) => s.gate).filter((g) => g.kind === 'Lorry' && g.out === null)
  const [supplier, setSupplier] = useState('Contoh Polimer Sdn Bhd')
  const [doNo, setDoNo] = useState('')
  const [material, setMaterial] = useState<MaterialId>('abs')
  const [qty, setQty] = useState(500)
  const [saved, setSaved] = useState<string | null>(null)
  const name = (id: MaterialId) => materials.find((m) => m.id === id)!

  return (
    <div>
      <AppHeader app="grn" />
      <div className="mb-4 grid grid-cols-4 gap-4">
        {materials.map((m) => (
          <Card key={m.id} className="py-3">
            <div className="text-xs text-dim uppercase">{m.name} in store</div>
            <div className={`tabular text-2xl font-bold ${m.balance <= m.reorderLevel ? 'text-idle' : ''}`}>
              {num(m.balance)} <span className="text-sm font-medium text-dim">{m.unit}</span>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <Truck size={18} className="text-accent" /> At the gate now
            </h2>
            {lorries.length === 0 ? (
              <div className="text-sm text-dim">No lorries waiting.</div>
            ) : (
              lorries.map((l) => (
                <div key={l.id} className="slide-in flex justify-between border-t border-line/50 py-2 text-sm first:border-0">
                  <span>
                    <b>{l.plate}</b> · {l.who}
                  </span>
                  <span className="text-dim">in {clock(l.in)}</span>
                </div>
              ))
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Receive a delivery</h2>
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-dim">Supplier</span>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-dim">Delivery order no.</span>
                <input value={doNo} onChange={(e) => setDoNo(e.target.value)} placeholder="e.g. CP-88210" className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-dim">Item</span>
                  <select value={material} onChange={(e) => setMaterial(e.target.value as MaterialId)} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-dim">Quantity ({name(material).unit})</span>
                  <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="tabular rounded-lg border border-line bg-panel-2 px-3 py-2" />
                </label>
              </div>
              <Button
                disabled={!doNo.trim() || !supplier.trim()}
                onClick={() => {
                  setSaved(receiveGrn({ supplier: supplier.trim(), doNo: doNo.trim(), lines: [{ material, qty }], by: 'Typed in' }))
                  setDoNo('')
                }}
              >
                <PackagePlus size={16} /> Receive into stock
              </Button>
              {saved && <div className="text-sm text-run">Saved as {saved}. Stock updated.</div>}
            </div>
          </Card>
        </div>
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-dim uppercase">
              <tr className="border-b border-line text-left">
                <th className="py-2.5 pl-4 font-medium">GRN</th>
                <th className="font-medium">Received</th>
                <th className="font-medium">Supplier · DO</th>
                <th className="font-medium">Items</th>
                <th className="pr-4 font-medium">How</th>
              </tr>
            </thead>
            <tbody>
              {grns.map((g) => (
                <tr key={g.id} className="slide-in border-b border-line/50 last:border-0">
                  <td className="py-3 pl-4 font-semibold">{g.id}</td>
                  <td className="text-dim">{dateTime(g.t)}</td>
                  <td>
                    <div>{g.supplier}</div>
                    <div className="text-xs text-dim">{g.doNo}</div>
                  </td>
                  <td>
                    {g.lines.map((l) => (
                      <div key={l.material} className="tabular">
                        {num(l.qty)} {name(l.material).unit} {name(l.material).name}
                      </div>
                    ))}
                  </td>
                  <td className="pr-4">
                    {g.by === 'AI read' ? (
                      <span className="inline-flex items-center gap-1 text-accent">
                        <Sparkles size={13} /> AI read
                      </span>
                    ) : (
                      <span className="text-dim">Typed in</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
