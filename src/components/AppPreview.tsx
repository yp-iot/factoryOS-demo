import { useLayoutEffect, useRef, useState } from 'react'
import { AppScreen } from '../areas/screens'
import { PreviewContext } from '../lib/preview'
import type { AppId } from '../sim/types'

// The screen is laid out at a desktop width, then shrunk to fit the card.
const SCREEN_WIDTH = 1200

/** A live, shrunk copy of an app's screen. Look only: it takes no clicks. */
export function AppPreview({ app }: { app: AppId }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / SCREEN_WIDTH)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={box} className="relative h-60 overflow-hidden rounded-lg border border-line bg-bg" aria-hidden inert>
      <div className="@container pointer-events-none origin-top-left p-4" style={{ width: SCREEN_WIDTH, transform: `scale(${scale})` }}>
        <PreviewContext.Provider value={true}>
          <AppScreen app={app} />
        </PreviewContext.Provider>
      </div>
      {/* Fade the cut-off bottom edge into the card. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-panel to-transparent group-hover:from-panel-2" />
    </div>
  )
}
