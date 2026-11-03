import { ChevronRight } from 'lucide-react'
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
            <Card className="flex h-full min-h-36 flex-col gap-3 p-5 transition hover:border-accent/60 hover:bg-panel-2">
              <div className="flex items-start gap-3">
                <h2 className="flex-1 text-xl font-semibold">{app.name}</h2>
                <ChevronRight className="mt-1 text-dim" size={20} />
              </div>
              <p className="text-dim">{app.blurb}</p>
              <AppPreview app={app.id} />
              <div className="mt-auto flex gap-2 empty:hidden">
                {app.hero && <HeroChip />}
                {app.hardware && <HardwareChip />}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
