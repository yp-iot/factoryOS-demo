export const num = (n: number, digits = 0) =>
  n.toLocaleString('en-MY', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const rm = (n: number, digits = 2) => `RM ${num(n, digits)}`

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`

export const clock = (t: number, seconds = false) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) })

export const date = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export const dateTime = (t: number) => `${date(t)}, ${clock(t)}`

/** 754 s → "12:34", 4000 s → "1:06:40" */
export function duration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const minutes = (ms: number) => Math.round(ms / 60000)

export function shiftOf(t: number): 'A' | 'B' {
  const h = new Date(t).getHours()
  return h >= 7 && h < 19 ? 'A' : 'B'
}
