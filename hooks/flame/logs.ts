import { hash, lerp } from './color'
import type { Buffer, RGB, Style } from './types'

// Logs are drawn as outlines, like sticks laid across each other, so the flame and embers show through.
export function drawLogs(buffer: Buffer, width: number, top: number, height: number, style: Style['logs'], sticks: number): void {
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
  if (style === 'crossed') {
    log(width * 0.12, bottom - 3, width * 0.78, top + 1, 3, brown, dark)
    log(width * 0.88, bottom - 3, width * 0.22, top + 1, 3, brown, dark)
    log(width * 0.2, bottom - 1, width * 0.8, bottom - 1, 2, brown, dark)
  } else if (style === 'teepee') {
    log(width * 0.12, bottom, width * 0.47, top, 0, brown, dark)
    log(width * 0.88, bottom, width * 0.53, top, 0, brown, dark)
    log(width * 0.28, bottom, width * 0.56, top + 1, 0, brown, dark)
    log(width * 0.72, bottom, width * 0.44, top + 1, 0, brown, dark)
    log(width * 0.2, bottom, width * 0.8, bottom, 0, brown, dark)
  } else if (style === 'sticks') {
    // Many thin sticks lean into a teepee, the outer ones lowest.
    for (let i = 0; i < sticks; i++) {
      const along = i / (sticks - 1)
      const apex = width * (0.5 + (hash(i, 1, 5) - 0.5) * 0.12)
      log(width * (0.08 + along * 0.84), bottom, apex, top + Math.abs(along - 0.5) * height * 0.5, 0, i % 2 ? brown : dark, dark)
    }
  } else if (style === 'torch') {
    // A thin pole with a wrapped head, the flame burning on top of it.
    const middle = Math.round((width - 1) / 2)
    for (let y = top; y <= bottom; y++) {
      const isHead = y < top + 3
      for (let dx = isHead ? -1 : 0; dx <= (isHead ? 1 : 0); dx++) {
        put(middle + dx, y, isHead ? dark : brown)
      }
    }
  }
}

// The glow on the logs: it flickers while the fire burns, and a few dim embers stay when it is down.
export function glowLogs(buffer: Buffer, width: number, top: number, height: number, t: number, isBurning: boolean): void {
  for (let y = top; y < top + height; y++) {
    for (let x = Math.round(width * 0.3); x < width * 0.7; x++) {
      const pixel = buffer[y]?.[x]
      if (pixel === null || pixel === undefined || pixel.priority !== 2 || pixel.color[0] <= 100 || pixel.color[1] >= 120) {
        continue
      }
      if (isBurning && hash(x, y, t) > 0.7) {
        pixel.color = hash(x, y, t + 9) > 0.5 ? [255, 106, 31] : [255, 179, 71]
      } else if (!isBurning && hash(x, y, 0) > 0.93) {
        pixel.color = [122, 42, 18]
      }
    }
  }
}
