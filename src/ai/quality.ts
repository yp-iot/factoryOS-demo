// Quality screens: final QC, NCRs, first article, AI camera.
import { seedInspections, WEEK, type Inspection } from '../areas/quality/qualityData'
import { clock, num, pct } from '../lib/format'
import { statusOf } from '../sim/orders'
import type { Store } from '../sim/store'
import type { AppId, Defect } from '../sim/types'
import type { Intent } from './types'
import { app, plural } from './util'

const inspections = (s: Store) => (s.appState['final-qc'] as Inspection[] | undefined) ?? seedInspections(s.simTime)

export const QUALITY: Partial<Record<AppId, Intent[]>> = {
  'final-qc': [
    {
      q: 'Which batches failed today?',
      keys: ['failed', 'fail', 'reject', 'batch'],
      answer: (s) => {
        const failed = inspections(s).filter((i) => !i.pass)
        return failed.length
          ? { text: `${plural(failed.length, 'batch', 'batches')} failed and ${failed.length === 1 ? 'is' : 'are'} on hold:`, bullets: failed.map((i) => `**${i.batch}** ${i.part} (${i.wo}): ${i.defects} defects in ${i.sample} sampled, ${clock(i.t)}`), go: { label: 'Open NCR & Returns', view: app('ncr') } }
          : { text: 'No batch has failed today.' }
      },
    },
    {
      q: 'How is the pass rate trending?',
      keys: ['trend', 'pass rate', 'week', 'improving', 'getting worse'],
      answer: (s) => {
        const list7 = inspections(s)
        const today = list7.filter((i) => i.pass).length / Math.max(1, list7.length)
        const avg = WEEK.reduce((a, b) => a + b, 0) / WEEK.length
        return {
          text: `Today **${pct(today)}** of batches passed. The last 7 days averaged **${avg.toFixed(0)}%**, lowest ${Math.min(...WEEK)}% and highest ${Math.max(...WEEK)}%.`,
          bullets: [`Last 7 days: ${WEEK.map((w) => `${w}%`).join(', ')}`],
        }
      },
    },
    {
      q: 'Which part has the most defects?',
      keys: ['most defects', 'worst part', 'defect', 'which part'],
      answer: (s) => {
        const worst = [...inspections(s)].sort((a, b) => b.defects / b.sample - a.defects / a.sample)[0]
        return { text: `**${worst.part}** (${worst.batch}) has the highest defect rate: ${worst.defects} in ${worst.sample} sampled, ${pct(worst.defects / worst.sample, 1)}.` }
      },
    },
  ],

  ncr: [
    {
      q: 'Which NCRs are still open?',
      keys: ['open', 'not closed', 'outstanding', 'pending'],
      answer: (s) => {
        const open = s.ncrs.filter((n) => n.status !== 'Closed')
        return open.length
          ? { text: `${plural(open.length, 'NCR')} not closed yet:`, bullets: open.map((n) => `**${n.id}** ${n.part} on ${n.machineId}: ${n.defect}, ${num(n.qty)} parts, ${n.status.toLowerCase()} (${n.owner})`) }
          : { text: 'Every NCR is closed.' }
      },
    },
    {
      q: 'Which returns cost us the most?',
      keys: ['return', 'customer', 'cost', 'biggest', 'most'],
      answer: (s) => {
        const ret = s.ncrs.filter((n) => n.source === 'Customer return').sort((a, b) => b.qty - a.qty)
        return ret.length
          ? { text: `The biggest customer return is **${ret[0].id}**: ${num(ret[0].qty)} ${ret[0].part.toLowerCase()} parts for ${ret[0].defect.toLowerCase()}.`, bullets: ret.slice(1).map((n) => `${n.id}: ${num(n.qty)} ${n.part.toLowerCase()}, ${n.defect.toLowerCase()}`) }
          : { text: 'No customer returns on record.' }
      },
    },
    {
      q: 'Which machine causes the most NCRs?',
      keys: ['machine', 'causes', 'source', 'where from'],
      answer: (s) => {
        const counts = new Map<string, number>()
        for (const n of s.ncrs) counts.set(n.machineId, (counts.get(n.machineId) ?? 0) + 1)
        const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
        return { text: `**${rows[0][0]}** has the most NCRs on record.`, bullets: rows.map(([m, n]) => `${m}: ${plural(n, 'NCR')}`) }
      },
    },
  ],

  'first-article': [
    {
      q: 'Which jobs still need a first article sign-off?',
      keys: ['sign', 'need', 'pending', 'which jobs', 'not signed'],
      answer: (s) => {
        const fai = (s.appState['fai'] as Record<string, { signedBy: string | null }> | undefined) ?? {}
        const jobs = s.workOrders.filter((o) => ['released', 'running'].includes(statusOf(o)))
        const unsigned = jobs.filter((o) => !fai[o.id]?.signedBy)
        return unsigned.length
          ? { text: `${plural(unsigned.length, 'job')} without a signed first article:`, bullets: unsigned.map((o) => `${o.id} ${o.part} on ${o.machineId} (${statusOf(o)})`) }
          : { text: 'Every running and released job has a signed first article.' }
      },
    },
    {
      q: 'What does a first article check?',
      keys: ['what', 'check', 'checklist', 'why'],
      answer: () => ({
        text: 'The first good parts off a new job are checked before the run continues, so a wrong mould, colour or dimension is caught at part 1 instead of part 10,000:',
        bullets: ['Mould and part number match the order', 'Material and colour', 'Key dimensions and weight', 'Visual defects', 'Label and carton quantity'],
      }),
    },
  ],

  'ai-camera': [
    {
      q: 'What defects is the camera catching?',
      keys: ['defect', 'catching', 'type', 'what kind'],
      answer: (s) => {
        const counts = new Map<Defect, number>()
        for (const r of s.camera.recent) counts.set(r.defect, (counts.get(r.defect) ?? 0) + 1)
        const rows = [...counts.entries()].sort((a, b) => b[1] - a[1])
        return rows.length
          ? { text: `In the last ${plural(s.camera.recent.length, 'reject')}, **${rows[0][0].toLowerCase()}** is the most common.`, bullets: rows.map(([d, n]) => `${d}: ${n}`) }
          : { text: 'No rejects yet in this run.' }
      },
    },
    {
      q: 'What is M5’s reject rate?',
      keys: ['reject rate', 'rate', 'm5', 'how many'],
      answer: (s) => {
        const total = s.camera.good + s.camera.reject
        return { text: `The camera has checked **${num(total)} parts** on M5 today and rejected **${num(s.camera.reject)}**, a reject rate of **${pct(s.camera.reject / Math.max(1, total), 1)}**.` }
      },
    },
    {
      q: 'How does the camera decide?',
      keys: ['how', 'work', 'decide', 'camera'],
      answer: () => ({
        text: 'A camera over the conveyor photographs every part. The model compares it with good parts it has seen and flags shapes that differ, such as a short shot or flash. Flagged parts are pushed off the line and counted, so nobody has to inspect every part by eye.',
      }),
    },
  ],
}
