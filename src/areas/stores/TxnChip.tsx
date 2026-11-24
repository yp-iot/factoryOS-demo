import type { TxnType } from '../../sim/types'

const TXN_STYLE: Record<TxnType, string> = {
  Receipt: 'bg-info/15 text-info',
  'Put-away': 'bg-run/15 text-run',
  Issue: 'bg-idle/15 text-idle',
  Dispatch: 'bg-accent/15 text-accent',
  Adjust: 'bg-violet-500/15 text-violet-500',
  'Write-off': 'bg-stop/15 text-stop',
}

export function TxnChip({ type }: { type: TxnType }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TXN_STYLE[type]}`}>{type}</span>
}
