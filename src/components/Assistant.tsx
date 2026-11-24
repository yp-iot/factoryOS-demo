import { ArrowRight, SendHorizontal, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { opening, reply, screenName, suggestions, viewKey, type Answer } from '../ai'
import { useStore } from '../sim/store'
import type { View } from '../sim/types'

interface Msg extends Answer {
  id: number
  role: 'user' | 'ai'
}

/** "**bold** text" → text with the bold parts in <b>. */
function rich(text: string): ReactNode[] {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))
}

/** The answer appears a few characters at a time, like it is being written. */
function Typed({ msg, onDone }: { msg: Msg; onDone: () => void }) {
  const full = [msg.text, ...(msg.bullets ?? [])].join('\n')
  const [n, setN] = useState(0)
  const [thinking, setThinking] = useState(true)
  useEffect(() => {
    const wait = setTimeout(() => setThinking(false), 450)
    return () => clearTimeout(wait)
  }, [])
  useEffect(() => {
    if (thinking) return
    if (n >= full.length) {
      onDone()
      return
    }
    const t = setTimeout(() => setN((x) => Math.min(full.length, x + 3)), 12)
    return () => clearTimeout(t)
  }, [n, thinking, full.length, onDone])

  if (thinking)
    return (
      <span className="inline-flex gap-1 py-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </span>
    )
  const shownText = full.slice(0, n).split('\n')
  return <Body msg={{ ...msg, text: shownText[0], bullets: shownText.slice(1), go: undefined }} />
}

function Body({ msg }: { msg: Msg }) {
  const go = useStore((s) => s.go)
  return (
    <>
      <p className="leading-relaxed">{rich(msg.text)}</p>
      {msg.bullets && msg.bullets.length > 0 && (
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 marker:text-accent">
          {msg.bullets.map((b, i) => (
            <li key={i}>{rich(b)}</li>
          ))}
        </ul>
      )}
      {msg.go && (
        <button onClick={() => go(msg.go!.view)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
          {msg.go.label} <ArrowRight size={14} />
        </button>
      )}
    </>
  )
}

// One shared empty list, so the store selector returns the same value until a chat starts.
const NONE: Msg[] = []

const setOpen = (v: boolean) => useStore.setState((s) => ({ appState: { ...s.appState, 'ai-open': v } }))

/** Add messages to one screen's chat. Returns the id of the last, which then types itself out. */
function append(chat: string, ...add: Omit<Msg, 'id'>[]) {
  const next = add.map((m, i) => ({ ...m, id: Date.now() + i }))
  useStore.setState((s) => ({ appState: { ...s.appState, [chat]: [...((s.appState[chat] as Msg[] | undefined) ?? []), ...next] } }))
  return next[next.length - 1].id
}

/** The first time the chat opens on a screen, it leads with what stands out there. */
function greet(v: View, typed: (id: number) => void) {
  const chat = `ai:${viewKey(v)}`
  if (((useStore.getState().appState[chat] as Msg[] | undefined) ?? []).length === 0) typed(append(chat, { role: 'ai', ...opening(v, useStore.getState()) }))
}

/** An AI chat on every screen, answering from the live demo data. */
export function Assistant() {
  const view = useStore((s) => s.view)
  const scenario = useStore((s) => s.scenario)
  const open = useStore((s) => !!s.appState['ai-open'])
  const key = `ai:${viewKey(view)}`
  const msgs = useStore((s) => (s.appState[key] as Msg[] | undefined) ?? NONE)
  const [typing, setTyping] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const list = useRef<HTMLDivElement>(null)

  // Moving to another screen with the chat open greets there too.
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.view !== prev.view && s.appState['ai-open']) greet(s.view, setTyping)
      }),
    [],
  )

  useEffect(() => {
    const el = list.current
    if (el) el.scrollTop = el.scrollHeight
  })

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const ask = (q: string) => {
    const text = q.trim()
    if (!text || typing !== null) return
    setDraft('')
    setTyping(append(key, { role: 'user', text }, { role: 'ai', ...reply(text, view, useStore.getState()) }))
  }

  // Sits above the host's "Powered by" badge in the bottom-right corner.
  const lift = scenario ? 'bottom-44 lg:bottom-36' : 'bottom-20'

  if (!open)
    return (
      <button
        onClick={() => {
          setOpen(true)
          greet(view, setTyping)
        }}
        className={`fixed right-4 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-amber-500 px-4 py-3 font-bold text-black shadow-xl shadow-black/25 transition hover:scale-105 lg:right-6 ${lift}`}
      >
        <Sparkles size={18} /> Ask AI
      </button>
    )

  return (
    <aside className="slide-in fixed inset-x-0 top-14 bottom-0 z-40 flex flex-col border-l border-line bg-panel shadow-2xl shadow-black/30 sm:left-auto sm:w-[25rem] lg:top-16">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-amber-500 text-black">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-bold">FactoryOS Assistant</div>
          <div className="flex items-center gap-1.5 truncate text-xs text-dim">
            <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-run" /> Reading live data · {screenName(view)}
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-dim hover:text-ink" aria-label="Close assistant">
          <X size={18} />
        </button>
      </div>

      <div ref={list} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-sm">
        {msgs.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="slide-in max-w-[85%] self-end rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 font-medium text-black">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="slide-in max-w-[92%] self-start rounded-2xl rounded-bl-sm border border-line bg-panel-2 px-3.5 py-2.5">
              {typing === m.id ? <Typed msg={m} onDone={() => setTyping(null)} /> : <Body msg={m} />}
            </div>
          ),
        )}
      </div>

      <div className="border-t border-line px-4 pt-3 pb-4">
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          {suggestions(view).map((i) => (
            <button
              key={i.q}
              onClick={() => ask(i.q)}
              disabled={typing !== null}
              className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-ink hover:bg-accent/20 disabled:opacity-50"
            >
              {i.q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-panel-2 py-1.5 pr-1.5 pl-3.5 focus-within:border-accent"
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask about ${screenName(view)}…`} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button type="submit" disabled={!draft.trim() || typing !== null} className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-black disabled:opacity-40" aria-label="Send">
            <SendHorizontal size={16} />
          </button>
        </form>
        <div className="mt-2 text-center text-[11px] text-dim">Answers are worked out from the live demo data at the moment you ask.</div>
      </div>
    </aside>
  )
}
