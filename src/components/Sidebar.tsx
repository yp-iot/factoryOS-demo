import { LayoutGrid } from 'lucide-react'
import { appMeta, AREAS } from '../areas/registry'
import { useStore } from '../sim/store'

export function Sidebar() {
  const view = useStore((s) => s.view)
  const go = useStore((s) => s.go)
  const openBreakdowns = useStore((s) => s.breakdowns.filter((b) => b.end === null).length)

  const currentArea = view.kind === 'area' ? view.area : view.kind === 'app' ? appMeta(view.app).area.id : null
  const item = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
      active ? 'bg-accent/15 text-accent' : 'text-dim hover:bg-panel-2 hover:text-ink'
    }`

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-line bg-panel p-3">
      <button className={item(view.kind === 'home')} onClick={() => go({ kind: 'home' })}>
        <LayoutGrid size={18} /> Home
      </button>
      <div className="my-2 h-px bg-line" />
      {AREAS.map((a) => (
        <button key={a.id} className={item(currentArea === a.id)} onClick={() => go({ kind: 'area', area: a.id })}>
          <a.icon size={18} />
          <span className="flex-1">{a.name}</span>
          {a.id === 'maintenance' && openBreakdowns > 0 && (
            <span className="alarm grid h-5 min-w-5 place-items-center rounded-full bg-stop px-1 text-xs font-bold text-white">
              {openBreakdowns}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
