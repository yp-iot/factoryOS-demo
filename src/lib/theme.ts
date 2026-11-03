import { useStore } from '../sim/store'

export type Theme = 'dark' | 'light'

const KEY = 'factoryos-theme'

/** The theme the viewer chose last time on this device; light if none. */
export function savedTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private windows can refuse storage; the theme still applies for this visit.
  }
}

// Charts draw SVG, whose attributes take plain colours, so they get the palette as values.
const CHART = {
  dark: {
    grid: '#24384e',
    tick: '#94a3b8',
    text: '#e8edf6',
    muted: '#334155',
    cursor: 'rgb(255 255 255 / 0.05)',
    tooltip: { background: '#12263c', border: '1px solid #24384e', borderRadius: 8, color: '#e8edf6' },
    run: '#22c55e',
    idle: '#f59e0b',
    stop: '#ef4444',
    info: '#38bdf8',
  },
  light: {
    grid: '#e3ddd2',
    tick: '#5a6270',
    text: '#0b1f33',
    muted: '#cbd5e1',
    cursor: 'rgb(11 31 51 / 0.05)',
    tooltip: { background: '#ffffff', border: '1px solid #d9d2c6', borderRadius: 8, color: '#0b1f33' },
    run: '#16a34a',
    idle: '#d97706',
    stop: '#dc2626',
    info: '#0284c7',
  },
}

export const useChartColors = () => CHART[useStore((s) => s.theme)]
