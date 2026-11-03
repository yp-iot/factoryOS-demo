import {
  Boxes,
  Factory,
  HardHat,
  ShieldCheck,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { AppId, AreaId } from '../sim/types'

export interface AppMeta {
  id: AppId
  name: string
  blurb: string
  hero?: boolean
  hardware?: boolean
}

export interface AreaMeta {
  id: AreaId
  name: string
  icon: LucideIcon
  apps: AppMeta[]
}

export const AREAS: AreaMeta[] = [
  {
    id: 'production',
    name: 'Production',
    icon: Factory,
    apps: [
      { id: 'daily-production', name: 'Daily Production Report', blurb: 'Output per machine vs target, filled from machine counts.' },
      { id: 'work-orders', name: 'Work Order Tracking', blurb: 'Every order, its machine, and how far along it is.', hero: true },
      { id: 'shift-handover', name: 'Shift Handover', blurb: 'The shift summary, drafted for you.' },
      { id: 'oee', name: 'OEE per Machine', blurb: 'Availability, performance and quality per machine.' },
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: Wrench,
    apps: [
      { id: 'breakdown', name: 'Breakdown Reporting', blurb: 'Opens itself when a machine stops. Times every minute down.', hero: true },
      { id: 'pm-schedule', name: 'Maintenance Schedule', blurb: 'Upcoming preventive maintenance. Overdue shows red.' },
      { id: 'spare-parts', name: 'Spare Parts', blurb: 'Stock of spares with reorder warnings.' },
      { id: 'machine-status', name: 'Machine Run/Stop Status', blurb: 'Every machine, live: current, temperature, last hour.', hardware: true },
    ],
  },
  {
    id: 'quality',
    name: 'Quality',
    icon: ShieldCheck,
    apps: [
      { id: 'final-qc', name: 'Final QC Inspection', blurb: 'Pass or fail each batch. Pass rate over time.' },
      { id: 'ncr', name: 'NCR & Customer Returns', blurb: 'Non-conformances and returns, tracked to closed.' },
      { id: 'first-article', name: 'First Article Inspection', blurb: 'Checklist and sign-off before a job starts.' },
      { id: 'ai-camera', name: 'AI Camera Defect Check', blurb: 'A camera checks every part and counts rejects.', hardware: true },
    ],
  },
  {
    id: 'stores',
    name: 'Stores & Warehouse',
    icon: Boxes,
    apps: [
      { id: 'material-control', name: 'AI Material Control', blurb: 'Material requests sized from the work order. Low-stock warning ahead of time.', hero: true },
      { id: 'grn', name: 'Goods Received (GRN)', blurb: 'Receive deliveries and update stock.' },
      { id: 'ai-do', name: 'AI Reads Delivery Orders', blurb: 'Snap a delivery order. The details fill themselves in.' },
      { id: 'voice-warehouse', name: 'Voice-Guided Warehouse', blurb: 'Pickers hear what to pick and say "done".', hardware: true },
    ],
  },
  {
    id: 'energy',
    name: 'Energy & Cost',
    icon: Zap,
    apps: [
      { id: 'job-costing', name: 'Job Costing', blurb: 'Material, machine time and power per order, against price.' },
      { id: 'scrap-revenue', name: 'Scrap Revenue Tracking', blurb: 'Scrap sold, by weight and RM per month.' },
      { id: 'power-cost', name: 'Power Cost per Machine', blurb: 'What each machine costs to run today, including idle time.', hero: true, hardware: true },
      { id: 'aircon', name: 'Smart Aircon Energy Saving', blurb: 'Aircon follows who is actually in the room.', hardware: true },
    ],
  },
  {
    id: 'people',
    name: 'People & Safety',
    icon: HardHat,
    apps: [
      { id: 'e-claim', name: 'E-Claim & Overtime Approval', blurb: 'Submit, approve on the phone, done.' },
      { id: 'roster', name: 'Shift Roster', blurb: 'Who works which shift this week.' },
      { id: 'sos', name: 'Worker SOS Safety Badge', blurb: 'One press sends an alert with the worker’s location.', hardware: true },
      { id: 'gate', name: 'Lorry & Visitor Check-In', blurb: 'Gate log of plates, times and purpose.', hardware: true },
    ],
  },
]

export const appMeta = (id: AppId): AppMeta & { area: AreaMeta } => {
  for (const area of AREAS) {
    const app = area.apps.find((a) => a.id === id)
    if (app) return { ...app, area }
  }
  throw new Error(`Unknown app ${id}`)
}

export const areaMeta = (id: AreaId) => AREAS.find((a) => a.id === id)!
