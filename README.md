# factoryOS-demo

A clickable, fully simulated factory operations dashboard for presenting to
factory owners. The factory is fictional ("Demo Plastics Sdn Bhd": six
injection moulding machines M1–M6 and one press P1). There is no backend:
every number is generated in the browser, and after the first load it runs
with no network. See [`DEMO_SPEC.md`](DEMO_SPEC.md) for the full brief.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # type-checks, then writes dist/
npm run preview    # serves dist/ on http://localhost:4173
```

Deploy: `netlify.toml` builds with `npm run build` and publishes `dist`.

## Presenting

- **Scenarios** (top right) plays one of six scripted stories, with a caption
  bar at the bottom to narrate from. **Next** skips ahead; steps that wait for
  you to tap something on screen say so.
- **Phone view** shows the alerts the owner, supervisor or technician would get.
- **1× / 10× / 60×** speeds the simulation up; the pause button stops it.
- **Reset** returns everything to 09:30 with the starting figures. Use it
  between audiences.
- Open the page once while online before presenting offline; the service
  worker caches the whole app on that first load.

## How it is built

Vite + React + TypeScript + Tailwind, Zustand for state, Recharts for charts,
lucide-react for icons, vite-plugin-pwa for offline.

| Path | What it is |
|---|---|
| `src/sim/` | The simulation. `engine.ts` ticks machines, power and stock every 2 s; `seed.ts` / `seedOps.ts` build the 09:30 start state (deterministic, so Reset replays it); `store.ts` holds it; `ops.ts` holds the quality, stores and people actions. |
| `src/areas/<area>/` | One folder per area, one file per app. `registry.ts` lists the 24 apps; `screens.tsx` maps each to its screen. |
| `src/scenarios/` | One file per scenario, plus `runner.ts` that plays the steps. |
| `src/components/` | Top bar, sidebar, scenarios panel, phone view, shared UI. |
| `src/views/` | Home and the area pages. |

## Hard rules (from the spec)

- The "Simulated demo" badge in the top bar is always visible.
- Never in the UI: IoT, SCADA, digital twin, platform, digital transformation,
  replace staff, or the name of any third-party software.
- Fictional factory, suppliers ("Contoh … Sdn Bhd") and people only. No
  customer names and no "% improvement achieved" claims. Estimates are
  labelled as estimates; cost inputs are labelled as demo assumptions.
