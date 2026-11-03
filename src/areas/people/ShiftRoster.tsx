import { AppHeader, Card } from '../../components/ui'
import { shown } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { useStore } from '../../sim/store'

type Cell = 'A' | 'B' | 'Off' | 'Leave'

const WORKERS = ['Siti', 'Raju', 'Ah Kow', 'Farah', 'Daniel', 'Ravi', 'Mei Ling', 'Aminah', 'Zul', 'Lim', 'Priya', 'Azman', 'Ali (tech)', 'Kumar (tech)', 'Hafiz (tech)']
const NEXT: Record<Cell, Cell> = { A: 'B', B: 'Off', Off: 'Leave', Leave: 'A' }
const STYLE: Record<Cell, string> = {
  A: 'bg-accent/20 text-accent',
  B: 'bg-info/20 text-info',
  Off: 'bg-panel-2 text-dim',
  Leave: 'bg-stop/15 text-stop',
}

// A rotating pattern: half the team on A, half on B, everyone gets a day off.
function seed(): Cell[][] {
  return WORKERS.map((_, w) => Array.from({ length: 7 }, (_, d) => ((d + w) % 7 === 6 ? 'Off' : w % 2 === 0 ? 'A' : 'B') as Cell))
}

export function ShiftRoster() {
  const now = useStore((s) => s.simTime)
  const [grid, setGrid] = useAppState('roster', seed)
  const monday = new Date(shown(now))
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
  const today = (new Date(shown(now)).getDay() + 6) % 7
  const count = (c: Cell) => grid.filter((row) => row[today] === c).length

  return (
    <div>
      <AppHeader app="roster">
        <div className="flex gap-3 text-sm">
          <span className="rounded-lg bg-accent/15 px-3 py-1.5 font-semibold text-accent">Shift A today: {count('A')}</span>
          <span className="rounded-lg bg-info/15 px-3 py-1.5 font-semibold text-info">Shift B today: {count('B')}</span>
        </div>
      </AppHeader>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2.5 pl-4 text-left text-xs font-medium text-dim uppercase">Worker</th>
              {days.map((d, i) => (
                <th key={i} className={`py-2 text-center text-xs font-medium ${i === today ? 'text-accent' : 'text-dim'}`}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  <div className="font-normal">{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORKERS.map((w, wi) => (
              <tr key={w} className="border-b border-line/40 last:border-0">
                <td className="py-1.5 pl-4 font-medium">{w}</td>
                {grid[wi].map((c, di) => (
                  <td key={di} className={`px-1 py-1 ${di === today ? 'bg-accent/[0.04]' : ''}`}>
                    <button
                      onClick={() => setGrid(grid.map((row, r) => (r === wi ? row.map((x, k) => (k === di ? NEXT[x] : x)) : row)))}
                      className={`w-full rounded-md py-1.5 text-xs font-bold ${STYLE[c]}`}
                    >
                      {c}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-2 text-xs text-dim">Tap a cell to change it. Shift A 07:00–19:00, shift B 19:00–07:00.</div>
    </div>
  )
}
