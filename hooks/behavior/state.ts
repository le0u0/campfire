import { atom, read, update } from 'claude-code'
import type { EngineInterface, Timer } from 'claude-code'

import type { CampfireJob } from '../../types'
import { DEFAULT_SIZE, DEFAULT_STYLE, newFire, SIZES, STYLES, stepFire } from '../flame'
import type { Fire } from '../flame'
import { levelOf } from './level'

export type $ = EngineInterface

const enabledAtom = atom({ plugin: 'campfire', key: 'campfireEnabled' } as const, true)
const jobAtom = atom({ plugin: 'campfire', key: 'job' } as const, null)
const tickAtom = atom({ plugin: 'campfire', key: 'tick' } as const, 0)

export const PANE = 'campfire-styles'

const STORE_KEY = 'campfireEnabled'
const STYLE_KEY = 'campfireStyle'
const SIZE_KEY = 'campfireSize'
const TICK_MS = 120
// How much fuel the fire gains or loses a frame: it catches in a few frames and dies down in about a second and a half.
const CATCH = 0.25
const DIE_DOWN = 0.07

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
export const session: { ticker: Timer | null; fire: Fire; isOn: boolean } = {
  ticker: null,
  fire: newFire(DEFAULT_STYLE, DEFAULT_SIZE),
  isOn: true,
}

// The frame clock runs while a job burns, and on until the flame has died down.
export function syncTicker($: $, job: CampfireJob | null): void {
  const isWanted = (job !== null && job.phase === 'burning') || session.fire.fuel > 0
  if (isWanted && session.ticker === null) {
    session.fire = newFire(session.fire.style, session.fire.size)
    session.ticker = $.clock.every(TICK_MS, async () => {
      const current = await readJob($)
      if (current === null || current.phase !== 'burning') {
        session.fire.fuel = Math.max(0, session.fire.fuel - DIE_DOWN)
        stepFire(session.fire, 1)
        syncTicker($, current)
        void bumpTick($)

        return
      }
      session.fire.fuel = Math.min(1, session.fire.fuel + CATCH)
      // The main loop is done: the fire goes out when the last subagent stops.
      if (current.isMainDone && !(await hasAgentRunning($))) {
        await finish($, 'done')

        return
      }
      stepFire(session.fire, levelOf(current.steps, (await $.clock.now()) - current.startedAt))
      void bumpTick($)
    })
  }
  if (!isWanted && session.ticker !== null) {
    session.ticker.cancel()
    session.ticker = null
  }
}

export async function hasAgentRunning($: $): Promise<boolean> {
  return (await $.agent.list()).some(agent => agent.status === 'running' || agent.status === 'pending')
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
  session.fire = newFire(index, session.fire.size, session.fire.fuel)
  await $.store.set(STYLE_KEY, index)
  await bumpTick($)
}

export async function applySize($: $, size: number): Promise<void> {
  session.fire = newFire(session.fire.style, size, session.fire.fuel)
  await $.store.set(SIZE_KEY, size)
  await bumpTick($)
}

export async function setEnabled($: $, isOn: boolean): Promise<void> {
  session.isOn = isOn
  await update($, enabledAtom, () => isOn)
  await $.store.set(STORE_KEY, isOn)
}

export async function setUp($: $): Promise<void> {
  const stored = await $.store.get(STORE_KEY)
  session.isOn = stored !== false
  await update($, enabledAtom, () => session.isOn)
  const style = await $.store.get(STYLE_KEY)
  const size = await $.store.get(SIZE_KEY)
  session.fire = newFire(
    typeof style === 'number' && STYLES[style] !== undefined ? style : DEFAULT_STYLE,
    typeof size === 'number' && SIZES[size] !== undefined ? size : DEFAULT_SIZE,
  )
  syncTicker($, await readJob($))
  await $.command.register({
    name: 'campfire',
    description: 'Turn Campfire on or off, resize it, or pick its look',
    argumentHint: 'on|off|bigger|smaller|style [number]',
  })
}
