// The assistant: which questions each screen offers, and how a typed question
// finds its answer. Answers are worked out from the live demo state; nothing is
// sent anywhere, so it works offline like the rest of the demo.
import { areaMeta, appMeta } from '../areas/registry'
import type { Store } from '../sim/store'
import type { AppId, View } from '../sim/types'
import { ENERGY } from './energy'
import { attention, GLOBAL } from './global'
import { MAINTENANCE } from './maintenance'
import { PEOPLE } from './people'
import { PRODUCTION } from './production'
import { QUALITY } from './quality'
import { STORES } from './stores'
import type { Answer, Intent } from './types'

export type { Answer } from './types'

const SCREENS: Partial<Record<AppId, Intent[]>> = { ...PRODUCTION, ...MAINTENANCE, ...QUALITY, ...STORES, ...ENERGY, ...PEOPLE }

export const viewKey = (v: View) => (v.kind === 'home' ? 'home' : v.kind === 'area' ? `area-${v.area}` : v.app)

export const screenName = (v: View) => (v.kind === 'home' ? 'the plant' : v.kind === 'area' ? areaMeta(v.area).name : appMeta(v.app).name)

/** The suggested questions for a screen: its own first, then the plant-wide one. */
export function suggestions(v: View): Intent[] {
  if (v.kind === 'home') return GLOBAL.slice(0, 3)
  if (v.kind === 'area') return [...areaMeta(v.area).apps.flatMap((a) => SCREENS[a.id]?.slice(0, 1) ?? []).slice(0, 4), GLOBAL[0]]
  return [...(SCREENS[v.app] ?? []), GLOBAL[0]]
}

/** What the assistant says when it opens on a screen. */
export function opening(v: View, s: Store): Answer {
  if (v.kind === 'app' && SCREENS[v.app]?.length) return SCREENS[v.app]![0].answer(s)
  return attention(s)
}

const words = (text: string) => text.toLowerCase().match(/[a-z0-9’']+/g) ?? []

// Words that appear in many questions point nowhere in particular, so they count for little.
const GENERIC = new Set(['how', 'how much', 'how many', 'how long', 'what', 'who', 'why', 'which', 'when', 'where', 'now', 'today', 'most', 'first', 'next', 'work', 'check'])

function score(intent: Intent, q: string) {
  let n = 0
  for (const k of intent.keys) if (q.includes(k)) n += GENERIC.has(k) ? 0.3 : k.includes(' ') ? 2 : 1
  // Long words from the suggested question itself count a little too.
  for (const w of words(intent.q)) if (w.length > 4 && q.includes(w)) n += 0.5
  return n
}

/** Answer a typed or tapped question, preferring this screen, then the plant, then any other screen. */
export function reply(question: string, v: View, s: Store): Answer {
  const q = question.toLowerCase().trim()
  const here = v.kind === 'app' ? (SCREENS[v.app] ?? []) : suggestions(v)
  const exact = [...here, ...GLOBAL, ...Object.values(SCREENS).flat()].find((i) => i.q.toLowerCase() === q)
  if (exact) return exact.answer(s)

  type Hit = { intent: Intent; score: number; app?: AppId }
  const hits: Hit[] = [
    ...here.map((intent) => ({ intent, score: score(intent, q) + 0.75 })),
    ...GLOBAL.map((intent) => ({ intent, score: score(intent, q) + 0.25 })),
    ...(Object.entries(SCREENS) as [AppId, Intent[]][]).flatMap(([id, list]) => list.map((intent) => ({ intent, score: score(intent, q), app: id }))),
  ].filter((h) => h.score >= 1)

  const best = hits.sort((a, b) => b.score - a.score)[0]
  if (!best) {
    return {
      text: `I don’t have an answer for that on ${screenName(v)} yet. Here is what I can tell you:`,
      bullets: suggestions(v).map((i) => i.q),
    }
  }
  const a = best.intent.answer(s)
  // An answer borrowed from another screen offers a way there.
  if (best.app && !here.includes(best.intent) && !a.go) return { ...a, go: { label: `Open ${appMeta(best.app).name}`, view: { kind: 'app', app: best.app } } }
  return a
}
