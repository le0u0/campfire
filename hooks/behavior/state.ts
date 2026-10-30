import { atom, read, update } from 'claude-code'
import type { EngineInterface, Timer } from 'claude-code'

import type { CampfireJob } from '../../types'
import { DEFAULT_SIZE, DEFAULT_STYLE, newFire, SIZES, STYLES, stepFire } from '../flame'
import type { Fire, Level } from '../flame'
import { levelOf } from './level'

export type $ = EngineInterface

const enabledAtom = atom({ plugin: 'campfire', key: 'campfireEnabled' } as const, true)
const jobAtom = atom({ plugin: 'campfire', key: 'job' } as const, null)
const tickAtom = atom({ plugin: 'campfire', key: 'tick' } as const, 0)

export const PANE = 'campfire-styles'

const STORE_KEY = 'campfireEnabled'
const STYLE_KEY = 'campfireStyle'
const SIZE_KEY = 'campfireSize'
const ALWAYS_KEY = 'campfireAlways'
const TICK_MS = 120

// The atoms are read and written only here, so the engine can list the values the plugin keeps.
export function readEnabled($: $): Promise<boolean> {
  return read($, enabledAtom)
}

export function readJob($: $): Promise<CampfireJob | null> {
  return read($, jobAtom)
}

export function readTick($: $): Promise<number> {
  return read($, tickAtom)
}

// A redraw of every reader of the tick.
export function bumpTick($: $): Promise<number> {
  return update($, tickAtom, tick => tick + 1)
}

// The module's own variables: they start over when the plugin reloads.
export const session: { ticker: Timer | null; fire: Fire; isOn: boolean; isAlwaysOn: boolean } = {
  ticker: null,
  fire: newFire(DEFAULT_STYLE, DEFAULT_SIZE),
  isOn: true,
  isAlwaysOn: false,
}

// The frame clock runs while a job burns, and all the time when the fire is always on.
export function syncTicker($: $, job: CampfireJob | null): void {
  const isWanted = (job !== null && job.phase === 'burning') || (session.isOn && session.isAlwaysOn)
  if (isWanted && session.ticker === null) {
    session.fire = newFire(session.fire.style, session.fire.size)
    session.ticker = $.clock.every(TICK_MS, async () => {
      const current = await readJob($)
      const isJob = current !== null && current.phase === 'burning'
      const level = isJob ? levelOf(current.steps, (await $.clock.now()) - current.startedAt) : 2
      stepFire(session.fire, session.isAlwaysOn ? (Math.max(level, 2) as Level) : level)
      void bumpTick($)
    })
  }
  if (!isWanted && session.ticker !== null) {
    session.ticker.cancel()
    session.ticker = null
  }
}

export async function setJob($: $, change: (job: CampfireJob | null) => CampfireJob | null): Promise<void> {
  syncTicker($, await update($, jobAtom, change))
}

export function patchBurning($: $, change: (job: CampfireJob) => CampfireJob): Promise<void> {
  return setJob($, job => (job !== null && job.phase === 'burning' ? change(job) : job))
}

export async function finish($: $, phase: 'done' | 'out'): Promise<void> {
  const finishedAt = await $.clock.now()
  await patchBurning($, job => ({ ...job, phase, finishedAt }))
}

export async function applyStyle($: $, index: number): Promise<void> {
  session.fire = newFire(index, session.fire.size)
  await $.store.set(STYLE_KEY, index)
  await bumpTick($)
}

export async function applySize($: $, size: number): Promise<void> {
  session.fire = newFire(session.fire.style, size)
  await $.store.set(SIZE_KEY, size)
  await bumpTick($)
}

export async function setEnabled($: $, isOn: boolean): Promise<void> {
  session.isOn = isOn
  await update($, enabledAtom, () => isOn)
  await $.store.set(STORE_KEY, isOn)
}

export async function setAlways($: $, isAlwaysOn: boolean): Promise<void> {
  session.isAlwaysOn = isAlwaysOn
  await $.store.set(ALWAYS_KEY, isAlwaysOn)
}

export async function setUp($: $): Promise<void> {
  const stored = await $.store.get(STORE_KEY)
  session.isOn = stored !== false
  await update($, enabledAtom, () => session.isOn)
  session.isAlwaysOn = (await $.store.get(ALWAYS_KEY)) === true
  const style = await $.store.get(STYLE_KEY)
  const size = await $.store.get(SIZE_KEY)
  session.fire = newFire(
    typeof style === 'number' && STYLES[style] !== undefined ? style : DEFAULT_STYLE,
    typeof size === 'number' && SIZES[size] !== undefined ? size : DEFAULT_SIZE,
  )
  syncTicker($, await readJob($))
  await $.command.register({
    name: 'campfire',
    description: 'Turn Campfire on or off, keep the fire lit, resize it, or pick its look',
    argumentHint: 'on|off|always [on|off]|bigger|smaller|style [number]',
  })
}
