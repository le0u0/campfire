// A campfire as a grid of pixels: flame is a grid of heat, smoke and sparks are particles, logs and stones are fixed.
// Each style draws the pixels its own way: half blocks or braille dots.
export { drawFire } from './draw'
export { newFire, stepFire } from './simulate'
export { DEFAULT_SIZE, DEFAULT_STYLE, SIZES, STYLES } from './styles'
export type { Cell, Fire, Level } from './types'
