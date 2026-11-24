// Demo data for the people screens, shared with the assistant.

export type Cell = 'A' | 'B' | 'Off' | 'Leave'

export const WORKERS = ['Siti', 'Raju', 'Ah Kow', 'Farah', 'Daniel', 'Ravi', 'Mei Ling', 'Aminah', 'Zul', 'Lim', 'Priya', 'Azman', 'Ali (tech)', 'Kumar (tech)', 'Hafiz (tech)']

// A rotating pattern: half the team on A, half on B, everyone gets a day off.
export function seedRoster(): Cell[][] {
  return WORKERS.map((_, w) => Array.from({ length: 7 }, (_, d) => ((d + w) % 7 === 6 ? 'Off' : w % 2 === 0 ? 'A' : 'B') as Cell))
}
