import { ChevronRight } from 'lucide-react'
import { areaMeta } from '../areas/registry'
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
          <button key={app.id} onClick={() => openApp(app.id)} className="text-left">
            <Card className="flex h-full min-h-36 flex-col gap-3 p-5 transition hover:border-accent/60 hover:bg-panel-2">
              <div className="flex items-start gap-3">
                <h2 className="flex-1 text-xl font-semibold">{app.name}</h2>
                <ChevronRight className="mt-1 text-dim" size={20} />
              </div>
              <p className="text-dim">{app.blurb}</p>
              <div className="mt-auto flex gap-2">
                {app.hero && <HeroChip />}
                {app.hardware && <HardwareChip />}
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
