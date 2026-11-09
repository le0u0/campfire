import type { Style } from './types'

export const STYLES: Style[] = [
  { name: 'Teepee', sim: { w: 21, h: 10, source: 5, decay: 0.09, lean: 2, smoke: 0.2, sparks: 0.4 }, smokeH: 2, logs: 'sticks', logsH: 5, overlap: 2, render: 'half', sticks: 5 },
  { name: 'Torch', sim: { w: 21, h: 8, source: 4, decay: 0.12, lean: 2, smoke: 0.3, sparks: 0.5 }, smokeH: 1, logs: 'torch', logsH: 7, overlap: 2, render: 'half' },
]

export const DEFAULT_STYLE = 0

// The size of the fire: how many rows of flame and smoke stand above the logs. The logs keep their shape; the canvas is as tall as the logs plus these rows.
export const SIZES = [
  { name: 'small', flameRows: 2 },
  { name: 'medium', flameRows: 3 },
  { name: 'large', flameRows: 5 },
]
export const DEFAULT_SIZE = 1
export const CANVAS_COLUMNS = 21

const CELL_HEIGHT = { braille: 4, half: 2 }
const shapes = new Map<string, Style>()

// A style as drawn at a size: the flame and smoke take the rows the size gives them above the logs, and burn narrower or wider with them.
export function shapeOf(index: number, size: number): Style {
  const key = `${index}:${size}`
  let shape = shapes.get(key)
  if (shape === undefined) {
    const style = STYLES[index]!
    const flameBefore = style.smokeH + style.sim.h
    const flameNow = SIZES[size]!.flameRows * CELL_HEIGHT[style.render]
    const ratio = flameNow / flameBefore
    const smokeH = Math.max(1, Math.round(style.smokeH * ratio))
    shape = {
      ...style,
      smokeH,
      sim: { ...style.sim, h: Math.max(4, flameNow - smokeH), source: style.sim.source * Math.min(1.4, Math.max(0.6, ratio)), decay: style.sim.decay / ratio },
    }
    shapes.set(key, shape)
  }

  return shape
}

// The rows of the canvas at a size: the flame rows, and the logs below them.
export function rowsOf(index: number, size: number): number {
  const style = STYLES[index]!

  return Math.ceil((SIZES[size]!.flameRows * CELL_HEIGHT[style.render] + style.logsH - style.overlap) / CELL_HEIGHT[style.render])
}
