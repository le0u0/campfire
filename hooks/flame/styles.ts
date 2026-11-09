import type { Style } from './types'

export const STYLES: Style[] = [
  { name: 'Teepee', sim: { w: 21, h: 10, source: 5, decay: 0.09, lean: 2, smoke: 0.2, sparks: 0.4 }, smokeH: 2, logs: 'sticks', logsH: 4, overlap: 2, render: 'half', sticks: 5 },
  { name: 'Torch', sim: { w: 21, h: 8, source: 4, decay: 0.12, lean: 2, smoke: 0.3, sparks: 0.5 }, smokeH: 1, logs: 'torch', logsH: 6, overlap: 2, render: 'half' },
]

export const DEFAULT_STYLE = 0

// How many rows of flame and smoke stand above the logs. The logs keep their shape; the canvas is as tall as the logs plus these rows.
const FLAME_ROWS = 3
export const CANVAS_COLUMNS = 21

const CELL_HEIGHT = { braille: 4, half: 2 }
const shapes = new Map<number, Style>()

// A style as drawn: the flame and smoke take the rows above the logs, and burn narrower or wider with them.
export function shapeOf(index: number): Style {
  let shape = shapes.get(index)
  if (shape === undefined) {
    const style = STYLES[index]!
    const flameBefore = style.smokeH + style.sim.h
    const flameNow = FLAME_ROWS * CELL_HEIGHT[style.render]
    const ratio = flameNow / flameBefore
    const smokeH = Math.max(1, Math.round(style.smokeH * ratio))
    shape = {
      ...style,
      smokeH,
      sim: { ...style.sim, h: Math.max(4, flameNow - smokeH), source: style.sim.source * Math.min(1.4, Math.max(0.6, ratio)), decay: style.sim.decay / ratio },
    }
    shapes.set(index, shape)
  }

  return shape
}

// The rows of the canvas: the flame rows, and the logs below them.
export function rowsOf(index: number): number {
  const style = STYLES[index]!

  return Math.ceil((FLAME_ROWS * CELL_HEIGHT[style.render] + style.logsH - style.overlap) / CELL_HEIGHT[style.render])
}
