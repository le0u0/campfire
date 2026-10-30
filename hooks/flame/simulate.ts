import { clamp } from './color'
import { shapeOf } from './styles'
import type { Fire, Level } from './types'

export function newFire(style: number, size: number): Fire {
  const { w, h } = shapeOf(style, size).sim

  return { style, size, level: 1 as Level, heat: Array.from({ length: h }, () => new Array<number>(w).fill(0)), particles: [], t: 0 }
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
