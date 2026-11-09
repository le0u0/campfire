import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { levelOf } from './behavior'

const BAND = {
  plugin: 'campfire',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

// The agents the engine reports; a test sets them.
let agents: { status: string }[] = []

function engine(on: On) {
  agents = []
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine row</Text>
  })
  on('tool.call', ($, e) => ({ result: `ran ${String(e.tool)}` }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [] }))
  on('agent.list', () => ({ value: agents as never }))

  return clock
}

test('the fire grows with the steps done', () => {
  expect(levelOf({})).toBe(1)
  expect(levelOf({}, 5000)).toBe(2)
  expect(levelOf({ a: 'active', b: 'pending', c: 'pending', d: 'pending' })).toBe(2)
  expect(levelOf({ a: 'done', b: 'done', c: 'active', d: 'pending' })).toBe(3)
  expect(levelOf({ a: 'done', b: 'done', c: 'done', d: 'active' })).toBe(4)
  expect(levelOf({ a: 'active' })).toBe(2)
})

const FIRE = /[▀▄⠀-⣿]/

test('a prompt lights the fire and a finished turn puts it out', async ($, on) => {
  const clock = engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  let ui = await $.ui.mount(BAND)
  const logs = (await ui.findAll({ type: 'Text' })).length
  expect(logs).toBeGreaterThan(0)
  await $.turn.start({ text: 'Make me a landing page', turnId: 't1' })
  await clock.advance(500)
  ui = await $.ui.mount(BAND)
  expect((await ui.findAll({ type: 'Text' })).length).toBeGreaterThan(logs)
  expect(await ui.find({ type: 'Text', text: 'engine row' })).toBeDefined()
  await $.turn.complete({ turnId: 't1', reason: 'end_turn', answer: 'ok' } as never)
  await clock.advance(10000)
  ui = await $.ui.mount(BAND)
  expect((await ui.findAll({ type: 'Text' })).length).toBe(logs)
})

test('/campfire off hides the fire', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'Make me a landing page', turnId: 't1' })
  await $.command.run({ command: 'campfire', args: 'off' } as never)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: FIRE })).toBeUndefined()
})

test('/campfire style opens a pane of numbered styles that a press picks', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const opened = await $.command.run({ command: 'campfire', args: 'style' } as never)
  expect(opened.text).toContain('Press 1-9')
  const pane = await $.ui.mount({ plugin: 'campfire', component: 'Pane', surface: 'terminal', requestId: 'campfire-styles', props: { title: 'Campfire styles', isFocused: false, bodyColumns: 100, placement: 'inline' } } as never)
  expect(await pane.find({ type: 'Text', text: /1\. Teepee/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /\[1\]/ })).toBeDefined()
  const picked = await $.command.run({ command: 'campfire', args: 'style 2' } as never)
  expect(picked.text).toContain('2. Torch')
  const unknown = await $.command.run({ command: 'campfire', args: 'style 99' } as never)
  expect(unknown.text).toContain('No such style')
})

test('the fire goes out when the turn ends, and burns on while a subagent runs', async ($, on) => {
  const clock = engine(on)
  agents = [{ status: 'running' }]
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'Make me a landing page', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', reason: 'end_turn', answer: 'ok' } as never)
  await clock.advance(500)
  let ui = await $.ui.mount(BAND)
  const burning = (await ui.findAll({ type: 'Text' })).length
  agents = [{ status: 'completed' }]
  await clock.advance(10000)
  ui = await $.ui.mount(BAND)
  expect((await ui.findAll({ type: 'Text' })).length).toBeLessThan(burning)
})

test('/campfire bigger and smaller step through the sizes and stop at the ends', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect((await $.command.run({ command: 'campfire', args: 'bigger' } as never)).text).toBe('The fire is large.')
  expect((await $.command.run({ command: 'campfire', args: 'bigger' } as never)).text).toContain('already as big')
  expect((await $.command.run({ command: 'campfire', args: 'smaller' } as never)).text).toBe('The fire is medium.')
  expect((await $.command.run({ command: 'campfire', args: 'smaller' } as never)).text).toBe('The fire is small.')
  expect((await $.command.run({ command: 'campfire', args: 'smaller' } as never)).text).toContain('already as small')
})

test('the size and style come back with a new session', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'campfire', args: 'bigger' } as never)
  await $.command.run({ command: 'campfire', args: 'style 2' } as never)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect((await $.command.run({ command: 'campfire', args: 'bigger' } as never)).text).toContain('already as big')
  expect((await $.command.run({ command: 'campfire', args: 'style' } as never)).text).toContain('pane')
})
