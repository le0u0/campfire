// A campfire as a grid of pixels: flame is a grid of heat, smoke and sparks are particles, logs and stones are fixed.
// Each style draws the pixels its own way: half blocks or braille dots.
export type Level = 1 | 2 | 3 | 4

type RGB = [number, number, number]
type Pixel = { color: RGB; priority: number; heat?: number }
type Buffer = (Pixel | null)[][]
type Particle = { x: number; y: number; vx: number; vy: number; life: number; fade: number; isSpark: boolean }

export type Cell = { char: string; color: string; background?: string }
export type Fire = { style: number; size: number; level: Level; heat: number[][]; particles: Particle[]; t: number }

type Style = {
  name: string
  sim: { w: number; h: number; source: number; decay: number; tongues?: number; lean?: number; smoke?: number; sparks?: number; licks?: number; smooth?: number; shift?: number }
  smokeH: number
  logs: 'crossed' | 'teepee' | 'sticks' | 'torch'
  logsH: number
  overlap: number
  render: 'half' | 'braille'
  sticks?: number
}

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
const CANVAS_COLUMNS = 21

const CELL_HEIGHT = { braille: 4, half: 2 }
const shapes = new Map<string, Style>()

// A style as drawn at a size: the flame and smoke take the height the canvas gives them above the logs, and burn wider or narrower.
function shapeOf(index: number, size: number): Style {
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

export function newFire(style: number, size: number): Fire {
  const { w, h } = shapeOf(style, size).sim

  return { style, size, level: 1 as Level, heat: Array.from({ length: h }, () => new Array<number>(w).fill(0)), particles: [], t: 0 }
}

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const FIRE_STOPS: [number, RGB][] = [
  [0, [20, 0, 0]],
  [0.2, [140, 20, 8]],
  [0.45, [235, 80, 15]],
  [0.7, [255, 170, 40]],
  [0.9, [255, 235, 140]],
  [1, [255, 255, 235]],
]

function fireColor(heat: number): RGB {
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

const hex = (color: RGB) => `#${color.map(value => value.toString(16).padStart(2, '0')).join('')}`
const dim = (color: RGB): RGB => color.map(value => Math.round(value * 0.45)) as RGB

function hash(x: number, y: number, t: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + t * 37.719) * 43758.5453

  return n - Math.floor(n)
}

// One frame on: the source burns along the bottom, heat rises, sways and fades; smoke and sparks drift off the tip.
export function stepFire(fire: Fire, level: Level, random: () => number = Math.random): void {
  fire.level = level
  const { w, h, source, decay, tongues = 1, lean = 5, smoke = 0.4, sparks = 0, licks = 0, smooth = 0.25, shift = 0 } = shapeOf(fire.style, fire.size).sim
  const grow = [0.6, 1, 1.2, 1.4][level - 1]!
  const width = source * [0.5, 0.8, 0.95, 1.1][level - 1]!
  fire.t += 1
  const { heat, t } = fire
  const middle = (w - 1) / 2 + shift
  const swayOf = (tongue: number) => Math.sin(t * 0.09 + tongue * 2.1) * 0.5 + Math.sin(t * 0.23 + tongue * 1.3) * 0.25
  const sway = swayOf(0)
  // The whole flame breathes: it lengthens and shortens from frame to frame.
  const breath = 0.8 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.37)) + 0.2 * random()
  const fade = decay / grow ** 1.6
  // Several tongues burn apart from each other, the middle one tallest, each swaying on its own.
  const centres = tongues === 1 ? [middle] : [middle - width * 0.3, middle + width * 0.02, middle + width * 0.32]
  const strength = tongues === 1 ? [1] : [0.8, 1, 0.7]
  const half = tongues === 1 ? width / 2 : (width / (2 * tongues)) * 1.15
  const bottom = heat[h - 1]!
  for (let x = 0; x < w; x++) {
    let base = 0
    centres.forEach((centre, tongue) => {
      const away = Math.abs(x - centre) / half
      if (away < 1) {
        base = Math.max(base, strength[tongue]! * (1 - away * away * 0.7) * (0.85 + random() * 0.15))
      }
    })
    bottom[x] = base
  }
  // Now and then a narrow lick of flame shoots up from the root, so the flame is ragged instead of a smooth dome.
  if (licks > 0 && random() < licks * grow) {
    const at = Math.round(middle + (random() - 0.5) * width * 0.7)
    for (const x of [at, at + 1]) {
      if (bottom[x] !== undefined) {
        bottom[x] = 1.35
      }
    }
  }
  for (let y = 0; y < h - 1; y++) {
    const height = 1 - y / (h - 1)
    // Each tongue narrows toward its tip and leans with the wind.
    const cone = half * (0.04 + 0.96 * (y / (h - 1)) ** 0.7)
    const leaning = centres.map((centre, tongue) => centre + swayOf(tongue) * lean * height * height)
    for (let x = 0; x < w; x++) {
      let outside = Infinity
      let edge = 1
      leaning.forEach(centre => {
        const gap = Math.max(0, Math.abs(x - centre) - cone)
        if (gap < outside) {
          outside = gap
          edge = Math.min(1, Math.abs(x - centre) / half)
        }
      })
      const from = clamp(x + clamp(Math.round(random() * 2 - 1 + sway), -1, 1), 0, w - 1)
      heat[y]![x] = Math.max(0, heat[y + 1]![from]! - fade * breath * random() * (1 + edge * 0.6) - outside * 0.12)
    }
    // Neighbours blend a little, so the flame reads as smooth shapes instead of noise.
    const row = heat[y]!
    const before = row.slice()
    for (let x = 0; x < w; x++) {
      row[x] = before[x]! * (1 - 2 * smooth) + (before[Math.max(0, x - 1)]! + before[Math.min(w - 1, x + 1)]!) * smooth
    }
  }

  // Smoke and sparks come off the flame itself, so nothing rises before the fire is up.
  const tip = heat.findIndex(row => Math.max(...row) > 0.3)
  if (tip !== -1) {
    const hot = heat[tip]!.flatMap((value, x) => (value > 0.3 ? [x] : []))
    const tipX = hot.reduce((sum, x) => sum + x, 0) / hot.length
    if (random() < smoke * grow) {
      fire.particles.push({
        x: tipX + (random() - 0.5) * 2,
        y: tip,
        vx: 0.1 + (random() - 0.5) * 0.2,
        vy: -(0.25 + random() * 0.3),
        life: 1,
        fade: 0.025 + random() * 0.015,
        isSpark: false,
      })
    }
    if (random() < sparks * grow) {
      fire.particles.push({
        x: tipX + (random() - 0.5) * width * 0.4,
        y: tip + (h - tip) * 0.4,
        vx: (random() - 0.5) * 0.9,
        vy: -(0.8 + random() * 0.9),
        life: 1,
        fade: 0.06 + random() * 0.04,
        isSpark: true,
      })
    }
  }
  fire.particles = fire.particles.filter(particle => {
    particle.x += particle.vx + (particle.isSpark ? 0 : Math.sin(t * 0.3 + particle.y) * 0.15)
    particle.y += particle.vy
    particle.life -= particle.fade

    return particle.life > 0 && particle.x >= 0 && particle.x < w
  })
}

// Logs are drawn as outlines, like sticks laid across each other, so the flame and embers show through.
function drawLogs(buffer: Buffer, width: number, top: number, height: number, style: Style['logs'], sticks: number): void {
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
function glowLogs(buffer: Buffer, width: number, top: number, height: number, t: number, isBurning: boolean): void {
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
