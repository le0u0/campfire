export type Level = 1 | 2 | 3 | 4

export type RGB = [number, number, number]
export type Pixel = { color: RGB; priority: number; heat?: number }
export type Buffer = (Pixel | null)[][]
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; fade: number; isSpark: boolean }

export type Cell = { char: string; color: string; background?: string }
// `fuel` is how strongly the fire is fed: 1 burns freely, and it falls to 0 as the fire dies down.
export type Fire = { style: number; level: Level; fuel: number; heat: number[][]; particles: Particle[]; t: number }

export type Style = {
  name: string
  sim: { w: number; h: number; source: number; decay: number; tongues?: number; lean?: number; smoke?: number; sparks?: number; licks?: number; smooth?: number; shift?: number }
  smokeH: number
  logs: 'sticks' | 'torch'
  logsH: number
  overlap: number
  render: 'half' | 'braille'
  sticks?: number
}
