import { defectCaught } from './defectCaught'
import { deliveryArrives } from './deliveryArrives'
import { machineStops } from './machineStops'
import { powerBillShock } from './powerBillShock'
import type { Scenario } from './runner'
import { supervisorOnLeave } from './supervisorOnLeave'
import { workerSos } from './workerSos'

/** In the order the panel lists them. Each call builds a fresh script. */
export const SCENARIOS: (() => Scenario)[] = [machineStops, defectCaught, deliveryArrives, powerBillShock, supervisorOnLeave, workerSos]
