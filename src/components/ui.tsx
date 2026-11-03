import { ArrowLeft, Cpu, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { appMeta } from '../areas/registry'
import { useStore } from '../sim/store'
import type { AppId, RunState } from '../sim/types'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-panel p-4 ${className}`}>{children}</div>
}

export const STATUS_COLOR: Record<RunState, string> = { run: 'bg-run', stop: 'bg-stop', idle: 'bg-idle' }
export const STATUS_TEXT: Record<RunState, string> = { run: 'text-run', stop: 'text-stop', idle: 'text-idle' }
export const STATUS_LABEL: Record<RunState, string> = { run: 'Running', stop: 'Stopped', idle: 'Idle' }

export function StatusLight({ status, size = 'md' }: { status: RunState; size?: 'sm' | 'md' | 'lg' }) {
  const px = { sm: 'h-2.5 w-2.5', md: 'h-3.5 w-3.5', lg: 'h-5 w-5' }[size]
  return <span className={`inline-block shrink-0 rounded-full ${px} ${STATUS_COLOR[status]} ${status === 'stop' ? 'alarm' : ''}`} />
}

/** Shown on apps that read from a device on the floor. */
export function HardwareChip({ live = true }: { live?: boolean }) {
  const speed = useStore((s) => s.speed)
  const flowing = live && speed > 0
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium text-dim">
      <Cpu size={13} /> Connected device
      {flowing && (
        <span className="inline-flex items-center gap-1.5 text-run">
          <span className="live-dot h-2 w-2 rounded-full bg-run" /> Live
        </span>
      )}
    </span>
  )
}

export function HeroChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
      <Star size={12} fill="currentColor" /> Featured
    </span>
  )
}

export function Stat({ label, value, sub, tone = 'text-ink', big = false }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string; big?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium tracking-wide text-dim uppercase">{label}</div>
      <div className={`tabular font-bold ${big ? 'text-4xl' : 'text-2xl'} ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-sm text-dim">{sub}</div>}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'ok'
  disabled?: boolean
  className?: string
}) {
  const styles = {
    primary: 'bg-accent text-black hover:bg-amber-400',
    ghost: 'border border-line bg-panel-2 text-ink hover:bg-line',
    danger: 'bg-stop text-white hover:bg-red-400',
    ok: 'bg-run text-black hover:bg-green-400',
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

/** Title row at the top of every app screen. */
export function AppHeader({ app, children }: { app: AppId; children?: ReactNode }) {
  const meta = appMeta(app)
  const go = useStore((s) => s.go)
  return (
    <div className="mb-4 flex items-center gap-4">
      <button
        onClick={() => go({ kind: 'area', area: meta.area.id })}
        className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-dim hover:text-ink"
      >
        <ArrowLeft size={16} /> {meta.area.name}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold">{meta.name}</h1>
          {meta.hero && <HeroChip />}
          {meta.hardware && <HardwareChip />}
        </div>
        <p className="text-sm text-dim">{meta.blurb}</p>
      </div>
      {children}
    </div>
  )
}
