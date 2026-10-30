import { expect, test } from 'claude-code/testing'

import { drawFire, newFire, SIZES, stepFire, STYLES } from '.'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647

  return seed / 2147483647
}

const widthOf = (row: { char: string }[]) => row.reduce((sum, cell) => sum + cell.char.length, 0)
const blazing = (style: number, size: number) => {
  const fire = newFire(style, size)
  const random = seeded(1)
  for (let i = 0; i < 80; i++) {
    stepFire(fire, 4, random)
  }

  return fire
}

test('every style fills the same canvas at every size', () => {
  for (let style = 0; style < STYLES.length; style++) {
    for (let size = 0; size < SIZES.length; size++) {
      for (const isBurning of [true, false]) {
        const rows = drawFire(blazing(style, size), isBurning)
        expect(rows).toHaveLength(SIZES[size]!.rows)
        for (const row of rows) {
          expect(widthOf(row)).toBe(21)
        }
      }
    }
  }
})

test('a blazing fire draws flame and a spent one only logs and embers', () => {
  const isLit = (cells: { color: string }[][]) => cells.flat().some(cell => cell.color !== '')
  for (let style = 0; style < STYLES.length; style++) {
    const fire = blazing(style, 1)
    const burning = drawFire(fire, true)
    const spent = drawFire(fire, false)
    expect(isLit(burning)).toBe(true)
    expect(isLit(spent)).toBe(true)
    expect(spent.flat().filter(cell => cell.char !== ' ').length).toBeLessThan(burning.flat().filter(cell => cell.char !== ' ').length)
  }
})

test('the same seed gives the same flame', () => {
  expect(JSON.stringify(drawFire(blazing(0, 1), true))).toBe(JSON.stringify(drawFire(blazing(0, 1), true)))
})

test('a stronger level burns hotter', () => {
  const heatAfter = (level: 1 | 4) => {
    const fire = newFire(0, 1)
    const random = seeded(3)
    for (let i = 0; i < 60; i++) {
      stepFire(fire, level, random)
    }

    return fire.heat.flat().reduce((sum, value) => sum + value, 0)
  }
  expect(heatAfter(4)).toBeGreaterThan(heatAfter(1))
})

test('style names are unique', () => {
  const names = STYLES.map(style => style.name.toLowerCase())
  expect(new Set(names).size).toBe(names.length)
})
