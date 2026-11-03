import { AppScreen } from './areas/screens'
import { PhonePanel, Toast } from './components/PhonePanel'
import { ScenarioCaption, ScenariosPanel } from './components/ScenariosPanel'
import { MobileNav, Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useSimLoop } from './sim/hooks'
import { useStore } from './sim/store'
import { AreaPage } from './views/AreaPage'
import { Home } from './views/Home'

export default function App() {
  useSimLoop()
  const view = useStore((s) => s.view)
  const scenario = useStore((s) => s.scenario)
  const key = view.kind === 'home' ? 'home' : view.kind === 'area' ? view.area : view.app

  return (
    <div className="flex h-dvh flex-col lg:min-h-[720px]">
      <TopBar />
      <MobileNav />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main key={key} className={`@container min-w-0 flex-1 overflow-y-auto p-4 lg:p-5 ${scenario ? 'pb-48 lg:pb-32' : ''}`}>
          {view.kind === 'home' && <Home />}
          {view.kind === 'area' && <AreaPage area={view.area} />}
          {view.kind === 'app' && <AppScreen app={view.app} />}
        </main>
        <PhonePanel />
      </div>
      <ScenariosPanel />
      <ScenarioCaption />
      <Toast />
    </div>
  )
}
