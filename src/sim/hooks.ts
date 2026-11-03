import { useCallback, useEffect, useRef, useState } from 'react'
import { TICK_MS, useStore } from './store'

/** Drives the simulation: one tick every 2 seconds of real time. */
export function useSimLoop() {
  const tick = useStore((s) => s.tick)
  useEffect(() => {
    const t = setInterval(tick, TICK_MS)
    return () => clearInterval(t)
  }, [tick])
}

/**
 * Sim time interpolated between ticks, so clocks and downtime timers move
 * smoothly instead of jumping every 2 seconds.
 */
export function useSimNow(intervalMs = 250) {
  const simTime = useStore((s) => s.simTime)
  const lastTickAt = useStore((s) => s.lastTickAt)
  const speed = useStore((s) => s.speed)
  const [real, setReal] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setReal(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  const elapsed = Math.min(Math.max(0, real - lastTickAt), TICK_MS)
  return simTime + elapsed * speed
}

/** useState that lives in the store: kept across screens, cleared by Reset. */
export function useAppState<T>(key: string, initial: () => T): [T, (v: T | ((prev: T) => T)) => void] {
  const stored = useStore((s) => s.appState[key]) as T | undefined
  const init = useRef(initial)
  const value = stored === undefined ? initial() : stored
  // Stable identity, so it is safe in effect dependencies.
  const set = useCallback(
    (v: T | ((prev: T) => T)) =>
      useStore.setState((s) => {
        const prev = (s.appState[key] as T | undefined) ?? init.current()
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        return { appState: { ...s.appState, [key]: next } }
      }),
    [key],
  )
  return [value, set]
}
