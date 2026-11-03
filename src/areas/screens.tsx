import type { ComponentType } from 'react'
import type { AppId } from '../sim/types'
import { AirconSaving } from './energy/AirconSaving'
import { JobCosting } from './energy/JobCosting'
import { PowerCost } from './energy/PowerCost'
import { ScrapRevenue } from './energy/ScrapRevenue'
import { BreakdownReporting } from './maintenance/BreakdownReporting'
import { MachineStatus } from './maintenance/MachineStatus'
import { MaintenanceSchedule } from './maintenance/MaintenanceSchedule'
import { SpareParts } from './maintenance/SpareParts'
import { EClaim } from './people/EClaim'
import { GateCheckIn } from './people/GateCheckIn'
import { ShiftRoster } from './people/ShiftRoster'
import { SosBadge } from './people/SosBadge'
import { DailyProduction } from './production/DailyProduction'
import { OeePerMachine } from './production/OeePerMachine'
import { ShiftHandover } from './production/ShiftHandover'
import { WorkOrders } from './production/WorkOrders'
import { AiCamera } from './quality/AiCamera'
import { FinalQc } from './quality/FinalQc'
import { FirstArticle } from './quality/FirstArticle'
import { NcrReturns } from './quality/NcrReturns'
import { AiReadsDo } from './stores/AiReadsDo'
import { GoodsReceived } from './stores/GoodsReceived'
import { MaterialControl } from './stores/MaterialControl'
import { VoiceWarehouse } from './stores/VoiceWarehouse'

const SCREENS: Record<AppId, ComponentType> = {
  'daily-production': DailyProduction,
  'work-orders': WorkOrders,
  'shift-handover': ShiftHandover,
  oee: OeePerMachine,
  breakdown: BreakdownReporting,
  'pm-schedule': MaintenanceSchedule,
  'spare-parts': SpareParts,
  'machine-status': MachineStatus,
  'final-qc': FinalQc,
  ncr: NcrReturns,
  'first-article': FirstArticle,
  'ai-camera': AiCamera,
  'material-control': MaterialControl,
  grn: GoodsReceived,
  'ai-do': AiReadsDo,
  'voice-warehouse': VoiceWarehouse,
  'job-costing': JobCosting,
  'scrap-revenue': ScrapRevenue,
  'power-cost': PowerCost,
  aircon: AirconSaving,
  'e-claim': EClaim,
  roster: ShiftRoster,
  sos: SosBadge,
  gate: GateCheckIn,
}

export function AppScreen({ app }: { app: AppId }) {
  const Screen = SCREENS[app]
  return <Screen />
}
