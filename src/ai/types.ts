import type { Store } from '../sim/store'
import type { View } from '../sim/types'

/** One reply. `text` may use **bold**; `bullets` render as a short list. */
export interface Answer {
  text: string
  bullets?: string[]
  go?: { label: string; view: View }
}

/** A question the assistant knows how to answer from the live demo state. */
export interface Intent {
  q: string // shown as a suggested question
  keys: string[] // words that point a typed question here
  answer: (s: Store) => Answer
}
