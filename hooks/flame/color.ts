import type { RGB } from './types'

export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const FIRE_STOPS: [number, RGB][] = [
  [0, [20, 0, 0]],
  [0.2, [140, 20, 8]],
  [0.45, [235, 80, 15]],
  [0.7, [255, 170, 40]],
  [0.9, [255, 235, 140]],
  [1, [255, 255, 235]],
]

export function fireColor(heat: number): RGB {
  for (let i = 1; i < FIRE_STOPS.length; i++) {
    const [stop, to] = FIRE_STOPS[i]!
    if (heat <= stop) {
      const [before, from] = FIRE_STOPS[i - 1]!
      const t = (heat - before) / (stop - before)

      return [0, 1, 2].map(k => Math.round(lerp(from[k]!, to[k]!, t))) as RGB
    }
  }

  return [255, 255, 235]
}

export const hex = (color: RGB) => `#${color.map(value => value.toString(16).padStart(2, '0')).join('')}`
export const dim = (color: RGB): RGB => color.map(value => Math.round(value * 0.45)) as RGB

export function hash(x: number, y: number, t: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + t * 37.719) * 43758.5453

  return n - Math.floor(n)
}
