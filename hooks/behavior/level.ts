import type { CampfireStepStatus } from '../../types'
import type { Level } from '../flame'

const SPARK_MS = 1500

// A spark while the fire catches, then a steady fire until a to-do list exists; with one it grows with the steps done, and blazes on the last.
export function levelOf(steps: Record<string, CampfireStepStatus>, elapsed = 0): Level {
  const all = Object.values(steps)
  const done = all.filter(status => status === 'done').length
  if (all.length === 0) {
    return elapsed < SPARK_MS ? 1 : 2
  }
  if (all.length >= 2 && all.length - done <= 1) {
    return 4
  }

  return done / all.length >= 0.5 ? 3 : 2
}
