import { hash, lerp } from './color'
import type { Buffer, RGB, Style } from './types'

// Logs are drawn as outlines, like sticks laid across each other, so the flame and embers show through.
export function drawLogs(buffer: Buffer, width: number, top: number, height: number, style: Style['logs'], sticks: number, isBurning: boolean): void {
  const put = (x: number, y: number, color: RGB) => {
    const column = Math.round(x)
    const row = buffer[Math.round(y)]
    if (row !== undefined && column >= 0 && column < width) {
      row[column] = { color, priority: 2 }
    }
  }
  const STEPS = 80
  // A log is two edges and a cap at each end; a stick is one edge.
  const log = (x0: number, y0: number, x1: number, y1: number, thick: number, edge: RGB, shade: RGB) => {
    for (let step = 0; step <= STEPS; step++) {
      const x = lerp(x0, x1, step / STEPS)
      const y = lerp(y0, y1, step / STEPS)
      put(x, y, edge)
      if (thick > 0) {
        put(x, y + thick, shade)
      }
    }
    for (let d = 0; d <= thick; d++) {
      put(x0, y0 + d, shade)
      put(x1, y1 + d, shade)
    }
  }
  const bottom = top + height - 1
  const brown: RGB = [160, 106, 53]
  const dark: RGB = [107, 68, 35]
  if (style === 'sticks') {
    // Many thin sticks lean into a teepee, the outer ones lowest.
    for (let i = 0; i < sticks; i++) {
      const along = i / (sticks - 1)
      const apex = width * (0.5 + (hash(i, 1, 5) - 0.5) * 0.12)
      log(width * (0.2 + along * 0.6), bottom, apex, top + Math.abs(along - 0.5) * height * 0.5, 0, i % 2 ? brown : dark, dark)
    }
  } else if (style === 'torch') {
    // A thin pole with a wrapped head, the flame burning on top of it.
    const middle = Math.round((width - 1) / 2)
    // The head is a rounded bulb with a rim, charred, with grey ash on top, when the fire is out; the pole is wrapped in bands.
    const char: RGB = [66, 46, 32]
    const ash: RGB = [112, 104, 96]
    const head = isBurning ? dark : char
    for (let y = top; y <= bottom; y++) {
      if (y < top + 3) {
        const reach = y === top + 1 ? 2 : 1
        for (let dx = -reach; dx <= reach; dx++) {
          put(middle + dx, y, Math.abs(dx) === 2 ? dark : !isBurning && y === top ? ash : head)
        }
      } else {
        put(middle, y, (y - top) % 3 === 0 ? dark : brown)
      }
    }
  }
}

// The glow on the logs: it flickers while the fire burns, and none stays when it is down.
export function glowLogs(buffer: Buffer, width: number, top: number, height: number, t: number, isBurning: boolean): void {
  for (let y = top; y < top + height; y++) {
    for (let x = Math.round(width * 0.3); x < width * 0.7; x++) {
      const pixel = buffer[y]?.[x]
      if (pixel === null || pixel === undefined || pixel.priority !== 2 || pixel.color[0] <= 100 || pixel.color[1] >= 120) {
        continue
      }
      if (isBurning && hash(x, y, t) > 0.7) {
        pixel.color = hash(x, y, t + 9) > 0.5 ? [255, 106, 31] : [255, 179, 71]
      }
    }
  }
}
