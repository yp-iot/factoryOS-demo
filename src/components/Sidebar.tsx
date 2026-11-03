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
    <nav className="hidden w-52 shrink-0 flex-col lg:flex gap-1 border-r border-line bg-panel p-3">
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

/** On a phone the sidebar becomes a row of tabs under the top bar, swiped sideways. */
export function MobileNav() {
  const view = useStore((s) => s.view)
  const go = useStore((s) => s.go)
  const openBreakdowns = useStore((s) => s.breakdowns.filter((b) => b.end === null).length)

  const currentArea = view.kind === 'area' ? view.area : view.kind === 'app' ? appMeta(view.app).area.id : null
  const tab = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
      active ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line text-dim'
    }`

  return (
    <nav className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b border-line bg-panel px-3 py-2 lg:hidden">
      <button className={tab(view.kind === 'home')} onClick={() => go({ kind: 'home' })}>
        <LayoutGrid size={15} /> Home
      </button>
      {AREAS.map((a) => (
        <button key={a.id} className={tab(currentArea === a.id)} onClick={() => go({ kind: 'area', area: a.id })}>
          <a.icon size={15} /> {a.name}
          {a.id === 'maintenance' && openBreakdowns > 0 && (
            <span className="alarm grid h-5 min-w-5 place-items-center rounded-full bg-stop px-1 text-xs font-bold text-white">{openBreakdowns}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
