# Iotronix Factory Demo — Build Spec

Put this file in the repo root and tell Claude Code: "Read DEMO_SPEC.md and build it."

## Goal
A clickable, fully simulated factory operations dashboard. The founder presents it on a laptop to Malaysian SME factory owners. It must look like a real running system, tell short stories in a few clicks, and work offline. There is no backend: all data is generated in the browser.

## Hard rules
- A small "Simulated demo" badge stays visible at all times (top bar).
- Never show these words in the UI: IoT, SCADA, digital twin, platform, digital transformation, replace staff. Never name any third-party software platform.
- Use English only. Currency is RM. Plain words, short labels.
- Use a fictional factory only: "Demo Plastics Sdn Bhd" with 6 injection moulding machines (M1–M6) and 1 press (P1).
- Never show customer names or results claims. No "% improvement achieved" numbers.

## Stack
- Vite + React + TypeScript + Tailwind CSS
- Recharts for charts, lucide-react for icons
- Zustand for the shared simulation state
- vite-plugin-pwa so it works offline after the first load
- No router library needed; use simple view state. If one is used, use hash routing so Netlify needs no redirects.
- Add `netlify.toml`: build command `npm run build`, publish dir `dist`.

## Layout (laptop, 1366×768 minimum)
- **Top bar:** Iotronix logo placeholder, factory name, live clock, shift (A/B), "Simulated demo" badge, and a "Scenarios" button.
- **Left sidebar:** Home, then the 6 areas.
- **Home:** 6 area cards, each with 1–2 live numbers, plus a machine strip showing M1–M6 and P1 as green/red/amber lights with today's output.
- **Area page:** 4 app tiles. Clicking a tile opens the app screen.
- **Hardware badge:** apps marked (hardware) show a small "Connected device" chip and a "Live" pulse when data is flowing.
- **Theme:** dark, industrial, high contrast, readable from across a table. Big numbers.

## Simulation engine (one store, ticks every 2 seconds)
- **Machines:** status (run/stop/idle), cycle time, shot count, good/scrap count, motor current, temperature, kW draw.
- **Production:** derived from machines. OEE = availability × performance × quality per machine.
- **Energy:** kWh accumulates from kW draw. Cost = kWh × rate. Show the rate as an editable "Demo assumption: RM/kWh" setting with a default of 0.50.
- **Stock:** materials (PP resin, ABS resin, masterbatch, cartons), with balances that drop as machines run.
- Include a speed control (1×, 10×, 60×) so a "whole shift" can be shown in a minute.
- Include a Reset button that returns to the clean start state.

## Apps (24)
★ = hero app (deep, interactive). Others are light: one good-looking screen with live or seeded data and 1–2 actions.

### Production
- Daily Production Report: output per machine vs target, filled automatically from machine counts.
- ★ Work Order Tracking: list of work orders (part, qty, machine, due date), with a progress bar driven by machine counts. Clicking one shows its timeline (released → running → QC → done). "Create work order" form; a new order appears and starts progressing.
- Shift Handover: auto-drafted summary of the shift (output, stops, issues) plus a notes field and an "Acknowledge" button.
- OEE per Machine: OEE gauges per machine with an availability / performance / quality breakdown.

### Maintenance
- ★ Breakdown Reporting: opens itself when a machine stops. Shows machine, time, duration ticking, a reason picker, the technician assigned, and a "Resolved" action. Includes a history list with downtime minutes.
- Maintenance Schedule: calendar/list of upcoming preventive maintenance; overdue items in red.
- Spare Parts: stock list with reorder-level warnings.
- Machine Run/Stop Status (hardware): live grid of all machines with current, temperature and a 1-hour run/stop timeline bar.

### Quality
- Final QC Inspection: pass/fail form per batch, with a pass-rate chart.
- NCR & Customer Returns: list of NCRs with status and an "Open NCR" form.
- First Article Inspection: checklist with sign-off before a work order can start.
- AI Camera Defect Check (hardware): simulated camera tile (drawn parts moving past) with bounding boxes on defects, a live good/reject counter, and the last 10 rejects with defect type. Do not use real photos.

### Stores & Warehouse
- ★ AI Material Control: material request flow. Production requests material, the AI suggests quantity from the work order, stores approves, and stock drops. Show low-stock prediction ("PP resin runs out in ~2 days at current usage").
- Goods Received (GRN): incoming deliveries list and a receive form that updates stock.
- AI Reads Delivery Orders: "Upload DO" opens a set of sample DO images (drawn/generated, fictional supplier). An animated "reading" step fills supplier, items and qty into a GRN for human confirmation. Always show a "Check before saving" step.
- Voice-Guided Warehouse (hardware): simulated chat-style voice log ("Pick 2 bags PP resin from rack B3" → "Done"), with a mic animation.

### Energy & Cost
- Job Costing: cost per work order = material + machine time + energy, with margin vs selling price.
- Scrap Revenue Tracking: scrap weights sold, RM per month.
- ★ Power Cost per Machine (hardware): live kW per machine, today's RM per machine, cost per good part, and a ranking of the most expensive machine. Clicking a machine shows a 24-hour kW chart with idle-but-powered periods highlighted ("RM X spent while idle today").
- Smart Aircon Energy Saving (hardware): zones with temperature, occupancy and aircon state; a "Saving mode" toggle shows the estimated kWh difference, labelled as an estimate.

### People & Safety
- E-Claim & Overtime Approval: submit → supervisor approve → done, with approval on a phone-style panel.
- Shift Roster: week grid of workers × shifts.
- Worker SOS Safety Badge (hardware): floor plan with worker dots; an SOS triggers a red alert with location.
- Lorry & Visitor Check-In (hardware): gate log with plate number, time in/out and purpose.

## Scenarios panel (the most important part)
Each scenario is one button that plays a scripted sequence, with a small caption at each step so the founder can narrate.

1. **"Machine stops"**: M3 goes red → Breakdown Report opens itself → phone-style toast "Technician Ali: M3 stopped, mould temp alarm" → downtime timer runs → OEE for M3 drops → after "Resolved", M3 returns to green.
2. **"Defect caught"**: camera flags 3 short-shot parts → rejects counter rises → NCR draft created automatically.
3. **"Delivery arrives"**: lorry checks in at the gate → AI reads the DO → GRN filled → stock rises.
4. **"Power bill shock"**: P1 left running idle → Power Cost highlights "RM spent while idle" → alert sent.
5. **"Supervisor on leave"**: Shift Handover and approvals route to the backup person automatically, showing that work doesn't stop when one person does. (Mark this as a concept; backup approvers are not yet confirmed in the product.)
6. **"Worker SOS"**: badge alert on the floor plan with location.

A "Phone view" side panel (a mock phone frame) shows the alerts the owner or technician would receive.

## Done when
- `npm run build` passes and the app runs from `dist` with no network.
- All 24 apps open; the 4 hero apps and the 6 scenarios work end to end.
- Reset returns everything to the start state.
- It looks good at 1366×768 and on a 1080p TV.
