import { Headphones, Mic } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { AppHeader, Button, Card } from '../../components/ui'
import { clock } from '../../lib/format'
import { useAppState } from '../../sim/hooks'
import { useIsPreview } from '../../lib/preview'
import { useStore } from '../../sim/store'

interface Line {
  who: 'system' | 'picker'
  text: string
  t: number
}

// One pick list, spoken a line at a time. The picker answers "Done".
const PICK_LISTS = [
  ['MR-0302 for M4. Pick 4 bags PP resin from rack B3.', 'Done.', 'Pick 1 bag white masterbatch from rack D1.', 'Done.', 'Take to M4 line side.', 'Done. At M4.', 'Pick list complete. Next: cartons for WO-1101.'],
  ['WO-1101 packing. Pick 20 cartons from rack F2.', 'Done.', 'Pick 1 roll of carton tape from rack F4.', 'Done, 1 roll.', 'Take to M1 packing table.', 'Done.', 'Pick list complete.'],
  ['MR-0303 for M1. Pick 18 bags PP resin from rack B3.', 'Only 16 on B3.', 'Take 2 more from rack B4, bottom shelf.', 'Done. 18 bags.', 'Take to M1 line side.', 'Done.', 'Pick list complete. Stock count for rack B3 updated.'],
]

export function VoiceWarehouse() {
  const speed = useStore((s) => s.speed)
  const preview = useIsPreview()
  const [log, setLog] = useAppState<Line[]>('voice-log', () => [])
  const [list, setList] = useAppState('voice-list', () => 0)
  const [step, setStep] = useAppState('voice-step', () => 0)
  const end = useRef<HTMLDivElement>(null)
  const script = PICK_LISTS[list % PICK_LISTS.length]
  const running = step < script.length

  useEffect(() => {
    if (!running || speed === 0 || preview) return
    const t = setTimeout(() => {
      setLog((l) => [...l, { who: step % 2 === 0 ? 'system' : 'picker', text: script[step], t: useStore.getState().simTime }])
      setStep(step + 1)
    }, step === 0 ? 600 : 2200)
    return () => clearTimeout(t)
  }, [step, running, speed, preview, script, setLog, setStep])

  useEffect(() => {
    if (preview) return
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [log.length, preview])

  const listening = running && step % 2 === 1

  return (
    <div>
      <AppHeader app="voice-warehouse" />
      <div className="grid grid-cols-[minmax(0,1fr)_18rem] gap-4">
        <Card className="flex h-[30rem] flex-col">
          <div className="mb-2 flex items-center gap-2 text-sm text-dim">
            <Headphones size={16} /> Headset 3 · Zul · Raw material store
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {log.map((l, i) => (
              <div key={i} className={`slide-in flex ${l.who === 'picker' ? 'justify-end' : ''}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${l.who === 'picker' ? 'rounded-br-sm bg-run/20' : 'rounded-bl-sm bg-panel-2'}`}>
                  <div className="text-[11px] text-dim">
                    {l.who === 'picker' ? 'Zul said' : 'Headset said'} · {clock(l.t, true)}
                  </div>
                  <div className="text-lg">{l.text}</div>
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-4 text-center">
          <div className={`grid h-28 w-28 place-items-center rounded-full ${listening ? 'bg-run/20' : 'bg-panel-2'}`}>
            <div className={`grid h-20 w-20 place-items-center rounded-full ${listening ? 'live-dot bg-run text-black' : 'bg-line text-dim'}`}>
              <Mic size={36} />
            </div>
          </div>
          <div className="font-semibold">{listening ? 'Listening…' : running ? 'Speaking' : 'Pick list done'}</div>
          <div className="text-sm text-dim">Hands stay free. The picker hears each step and answers out loud.</div>
          {!running && (
            <Button
              onClick={() => {
                setList(list + 1)
                setStep(0)
              }}
            >
              Next pick list
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}
