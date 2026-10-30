import { dim, fireColor, hex, lerp } from './color'
import { drawLogs, glowLogs } from './logs'
import { CANVAS_COLUMNS, shapeOf, SIZES } from './styles'
import type { Buffer, Cell, Fire, Pixel, RGB, Style } from './types'

function paint(fire: Fire, isBurning: boolean): { buffer: Buffer; logsTop: number } {
  const style = shapeOf(fire.style, fire.size)
  const { w, h } = style.sim
  const logsTop = style.smokeH + h - style.overlap
  const buffer: Buffer = Array.from({ length: logsTop + style.logsH }, () => new Array<Pixel | null>(w).fill(null))
  if (isBurning) {
    for (const particle of fire.particles) {
      const y = Math.round(particle.y) + style.smokeH
      const x = Math.round(particle.x)
      const row = buffer[y]
      if (row === undefined) {
        continue
      }
      if (particle.isSpark) {
        row[x] = { color: [255, 210, 122], priority: 4 }
      } else if (Math.sin(x * 9.1 + y * 5.3 + fire.t * 3.3) * 0.5 + 0.5 < particle.life * 0.9) {
        const grey = Math.round(lerp(70, 165, particle.life))
        row[x] = { color: [grey, grey, grey], priority: 1 }
        if (particle.life > 0.5 && x + 1 < w && row[x + 1] === null) {
          row[x + 1] = { color: [grey, grey, grey], priority: 1 }
        }
      }
    }
  }
  drawLogs(buffer, w, logsTop, style.logsH, style.logs, style.sticks ?? 9)
  glowLogs(buffer, w, logsTop, style.logsH, fire.t, isBurning)
  if (isBurning) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const heat = fire.heat[y]![x]!
        if (heat > 0.16) {
          buffer[y + style.smokeH]![x] = { color: fireColor(heat), priority: 3, heat }
        }
      }
    }
  }

  return { buffer, logsTop }
}

const BITS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
]

function toCells(buffer: Buffer, render: Style['render'], isBurning: boolean): Cell[][] {
  const width = buffer[0]!.length
  const shade = (color: RGB) => hex(isBurning ? color : dim(color))
  const rows: Cell[][] = []
  if (render === 'braille') {
    for (let y = 0; y < buffer.length; y += 4) {
      const row: Cell[] = []
      for (let x = 0; x < width; x += 2) {
        let mask = 0
        let best: Pixel | null = null
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 4; dy++) {
            const pixel = buffer[y + dy]?.[x + dx]
            if (pixel !== null && pixel !== undefined) {
              mask |= BITS[dx]![dy]!
              if (best === null || pixel.priority > best.priority || (pixel.priority === best.priority && (pixel.heat ?? 0) > (best.heat ?? 0))) {
                best = pixel
              }
            }
          }
        }
        row.push(best === null ? { char: ' ', color: '' } : { char: String.fromCharCode(0x2800 + mask), color: shade(best.color) })
      }
      rows.push(row)
    }

    return rows
  }
  for (let y = 0; y < buffer.length; y += 2) {
    const row: Cell[] = []
    for (let x = 0; x < width; x++) {
      const upper = buffer[y]![x]
      const lower = buffer[y + 1]?.[x]
      if (upper && lower) {
        row.push({ char: '▀', color: shade(upper.color), background: shade(lower.color) })
      } else if (upper) {
        row.push({ char: '▀', color: shade(upper.color) })
      } else if (lower) {
        row.push({ char: '▄', color: shade(lower.color) })
      } else {
        row.push({ char: ' ', color: '' })
      }
    }
    rows.push(row)
  }

  return rows
}

// A burning fire shows flame, smoke and sparks above glowing logs; a spent one shows cold logs and a few dim embers.
export function drawFire(fire: Fire, isBurning: boolean): Cell[][] {
  const style = shapeOf(fire.style, fire.size)
  const { buffer, logsTop } = paint(fire, isBurning)
  const from = isBurning ? 0 : Math.floor(logsTop / 4) * 4

  return fitCanvas(toCells(buffer.slice(from), style.render, isBurning), fire.size)
}

// Every style draws on the same canvas for a size, the fire standing at the bottom middle, so the band never changes size.
function fitCanvas(rows: Cell[][], size: number): Cell[][] {
  const CANVAS = { rows: SIZES[size]!.rows, columns: CANVAS_COLUMNS }
  const blank = (): Cell => ({ char: ' ', color: '' })
  const kept = rows.slice(-CANVAS.rows)
  const fitted = kept.map(row => {
    const width = row.reduce((sum, cell) => sum + cell.char.length, 0)
    const left = Math.max(0, Math.floor((CANVAS.columns - width) / 2))
    const right = Math.max(0, CANVAS.columns - width - left)

    return [...Array.from({ length: left }, blank), ...row, ...Array.from({ length: right }, blank)]
  })

  return [
    ...Array.from({ length: CANVAS.rows - fitted.length }, () => Array.from({ length: CANVAS.columns }, blank)),
    ...fitted,
  ]
}
