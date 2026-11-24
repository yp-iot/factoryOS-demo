// Demo data for the maintenance screens, shared with the assistant.

// Due dates are days from the demo start; negative means overdue.
export const TASKS = [
  { id: 'PM-118', machine: 'M4', task: 'Hydraulic oil and filter change', every: 'Every 6 months', dueIn: -3, tech: 'Hafiz' },
  { id: 'PM-121', machine: 'P1', task: 'Press guard and interlock check', every: 'Monthly', dueIn: -1, tech: 'Ali' },
  { id: 'PM-119', machine: 'M1', task: 'Mould cleaning and vent check', every: 'Every 2 weeks', dueIn: 0, tech: 'Kumar' },
  { id: 'PM-122', machine: 'M3', task: 'Heater band and thermocouple check', every: 'Monthly', dueIn: 1, tech: 'Ali' },
  { id: 'PM-120', machine: 'M2', task: 'Screw and barrel wear check', every: 'Every 3 months', dueIn: 3, tech: 'Hafiz' },
  { id: 'PM-123', machine: 'Compressor', task: 'Drain and air filter', every: 'Weekly', dueIn: 4, tech: 'Kumar' },
  { id: 'PM-124', machine: 'M5', task: 'Lubrication of toggle and tie bars', every: 'Monthly', dueIn: 6, tech: 'Ali' },
  { id: 'PM-125', machine: 'M6', task: 'Chiller water check', every: 'Every 2 weeks', dueIn: 9, tech: 'Kumar' },
]

export const PARTS = [
  { code: 'SP-HB-220', name: 'Heater band 220 V, 60 mm', fits: 'M1–M6', stock: 3, reorder: 6, location: 'Cabinet A2' },
  { code: 'SP-TC-K', name: 'Thermocouple type K', fits: 'All', stock: 12, reorder: 8, location: 'Cabinet A2' },
  { code: 'SP-EP-6', name: 'Ejector pin 6 mm', fits: 'M3, M4', stock: 2, reorder: 10, location: 'Cabinet B1' },
  { code: 'SP-HF-10', name: 'Hydraulic filter 10 µm', fits: 'M2, M4, M6', stock: 4, reorder: 4, location: 'Shelf C' },
  { code: 'SP-NZ-M5', name: 'Nozzle tip', fits: 'M5', stock: 3, reorder: 2, location: 'Cabinet B1' },
  { code: 'SP-OR-KIT', name: 'O-ring kit, cooling lines', fits: 'All', stock: 9, reorder: 5, location: 'Cabinet B2' },
  { code: 'SP-PX-24', name: 'Proximity sensor 24 V', fits: 'P1', stock: 1, reorder: 2, location: 'Cabinet A1' },
  { code: 'SP-CB-16', name: 'Contactor 16 A', fits: 'All', stock: 5, reorder: 3, location: 'Cabinet A1' },
]
