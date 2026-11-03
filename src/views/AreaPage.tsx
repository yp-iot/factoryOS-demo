import { areaMeta } from '../areas/registry'
import { AppPreview } from '../components/AppPreview'
import { Card, HardwareChip, HeroChip } from '../components/ui'
import { useStore } from '../sim/store'
import type { AreaId } from '../sim/types'

export function AreaPage({ area }: { area: AreaId }) {
  const meta = areaMeta(area)
  const openApp = useStore((s) => s.openApp)
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-panel-2 text-accent">
          <meta.icon size={24} />
        </span>
        <h1 className="text-3xl font-bold">{meta.name}</h1>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {meta.apps.map((app) => (
          // A div, not a button: the live preview inside holds buttons of its own.
          <div
            key={app.id}
            role="button"
            tabIndex={0}
            onClick={() => openApp(app.id)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              openApp(app.id)
            }}
            className="group cursor-pointer text-left"
          >
            {/* The screen comes first, so a client can pick by what catches their eye. */}
            <Card className="flex h-full flex-col gap-3 transition group-hover:border-accent/60 group-hover:bg-panel-2">
              <AppPreview app={app.id} />
              <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
                <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs font-semibold text-dim group-hover:bg-panel">{meta.name}</span>
                {app.hero && <HeroChip />}
                {app.hardware && <HardwareChip />}
              </div>
              <div className="px-1 pb-1">
                <h2 className="mb-1 text-xl font-bold transition group-hover:text-accent">{app.name}</h2>
                <p className="text-dim">{app.blurb}</p>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
