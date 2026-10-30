import type { Style } from './types'

export const STYLES: Style[] = [
  { name: 'Classic', sim: { w: 42, h: 22, source: 13, decay: 0.05, lean: 8, licks: 0.7, smooth: 0.06 }, smokeH: 3, logs: 'crossed', logsH: 8, overlap: 5, render: 'braille' },
  { name: 'Pyre', sim: { w: 42, h: 19, source: 14, decay: 0.048, lean: 4, smoke: 0.2, sparks: 0.4 }, smokeH: 2, logs: 'sticks', logsH: 14, overlap: 7, render: 'braille', sticks: 11 },
  { name: 'Teepee', sim: { w: 21, h: 10, source: 8, decay: 0.12, smoke: 0.8, shift: 1 }, smokeH: 2, logs: 'teepee', logsH: 6, overlap: 4, render: 'half' },
  { name: 'Torch', sim: { w: 21, h: 8, source: 4, decay: 0.12, lean: 2, smoke: 0.3, sparks: 0.5 }, smokeH: 1, logs: 'torch', logsH: 7, overlap: 2, render: 'half' },
]

export const DEFAULT_STYLE = 0

// The size of the flame: how tall the canvas is, and how wide the flame burns. The logs and the canvas width stay as they are.
export const SIZES = [
  { name: 'small', factor: 0.7, rows: 5 },
  { name: 'medium', factor: 1, rows: 7 },
  { name: 'large', factor: 1.4, rows: 10 },
]
export const DEFAULT_SIZE = 1
export const CANVAS_COLUMNS = 21

const CELL_HEIGHT = { braille: 4, half: 2 }
const shapes = new Map<string, Style>()

// A style as drawn at a size: the flame and smoke take the height the canvas gives them above the logs, and burn wider or narrower.
export function shapeOf(index: number, size: number): Style {
  const style = STYLES[index]!
  const { factor, rows } = SIZES[size]!
  if (factor === 1) {
    return style
  }
  const key = `${index}:${size}`
  let shape = shapes.get(key)
  if (shape === undefined) {
    const flameBefore = style.smokeH + style.sim.h
    const flameNow = rows * CELL_HEIGHT[style.render] - style.logsH + style.overlap
    const ratio = flameNow / flameBefore
    const smokeH = Math.round(style.smokeH * ratio)
    shape = {
      ...style,
      smokeH,
      sim: { ...style.sim, h: Math.max(4, flameNow - smokeH), source: style.sim.source * factor, decay: style.sim.decay / ratio },
    }
    shapes.set(key, shape)
  }

  return shape
}
