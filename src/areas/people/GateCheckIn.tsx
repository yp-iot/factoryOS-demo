import { LogIn, LogOut, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock } from '../../lib/format'
import { checkIn, checkOut } from '../../sim/ops'
import { useStore } from '../../sim/store'
import type { GateEntry } from '../../sim/types'

const KIND_CHIP: Record<GateEntry['kind'], string> = {
  Lorry: 'bg-accent/15 text-accent',
  Visitor: 'bg-info/15 text-info',
  Contractor: 'bg-slate-500/20 text-dim',
}

export function GateCheckIn() {
  const gate = useStore((s) => s.gate)
  const [kind, setKind] = useState<GateEntry['kind']>('Visitor')
  const [plate, setPlate] = useState('')
  const [who, setWho] = useState('')
  const [purpose, setPurpose] = useState('')
  const onSite = gate.filter((g) => g.out === null)
  const sorted = [...gate].sort((a, b) => b.in - a.in)

  return (
    <div>
      <AppHeader app="gate">
        <div className="rounded-lg bg-panel-2 px-3 py-2 text-sm">
          On site now: <b className="tabular text-lg">{onSite.length}</b>
        </div>
      </AppHeader>
      <Card className="mb-4">
        <div className="grid grid-cols-2 items-end gap-3 text-sm @5xl:grid-cols-[9rem_9rem_1fr_1fr_auto]">
          <label className="flex flex-col gap-1">
            <span className="text-dim">Type</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as GateEntry['kind'])} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
              <option>Visitor</option>
              <option>Lorry</option>
              <option>Contractor</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 text-dim">
              <ScanLine size={13} /> Plate (camera)
            </span>
            <input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="e.g. WXY 4821" className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-dim">Name or company</span>
            <input value={who} onChange={(e) => setWho(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-dim">Purpose</span>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="rounded-lg border border-line bg-panel-2 px-3 py-2" />
          </label>
          <Button
            disabled={!who.trim() || !purpose.trim()}
            onClick={() => {
              checkIn({ kind, plate: plate.trim() || null, who: who.trim(), purpose: purpose.trim() })
              setPlate('')
              setWho('')
              setPurpose('')
            }}
          >
            <LogIn size={16} /> Check in
          </Button>
        </div>
      </Card>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-dim uppercase">
            <tr className="border-b border-line text-left">
              <th className="py-2.5 pl-4 font-medium">Plate</th>
              <th className="font-medium">Type</th>
              <th className="font-medium">Who</th>
              <th className="font-medium">Purpose</th>
              <th className="font-medium">In</th>
              <th className="font-medium">Out</th>
              <th className="pr-4" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <tr key={g.id} className="slide-in border-b border-line/50 last:border-0">
                <td className="py-3 pl-4">{g.plate ? <span className="font-bold tracking-wider whitespace-nowrap">{g.plate}</span> : <span className="text-dim">On foot</span>}</td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${KIND_CHIP[g.kind]}`}>{g.kind}</span>
                </td>
                <td className="font-medium">{g.who}</td>
                <td className="text-dim">{g.purpose}</td>
                <td className="tabular">{clock(g.in)}</td>
                <td className="tabular">{g.out ? clock(g.out) : <span className="text-run">On site</span>}</td>
                <td className="pr-4 text-right">
                  {!g.out && (
                    <Button variant="ghost" onClick={() => checkOut(g.id)}>
                      <LogOut size={15} /> Check out
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
