import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { levelOf } from './campfire'

const BAND = {
  plugin: 'campfire',
  component: 'AbovePrompt',
  surface: 'terminal',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

function engine(on: On) {
  mock.clock(on)
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

test('a prompt lights the fire and a finished turn leaves the logs', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  let ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: FIRE })).toBeUndefined()
  await $.turn.start({ text: 'Make me a landing page', turnId: 't1' })
  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: FIRE })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'engine row' })).toBeDefined()
  await $.turn.complete({ turnId: 't1', reason: 'end_turn', answer: 'ok' } as never)
  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: FIRE })).toBeDefined()
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
  expect(await pane.find({ type: 'Text', text: /1\. Classic/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /\[1\]/ })).toBeDefined()
  const picked = await $.command.run({ command: 'campfire', args: 'style 2' } as never)
  expect(picked.text).toContain('2. Pyre')
  const unknown = await $.command.run({ command: 'campfire', args: 'style 99' } as never)
  expect(unknown.text).toContain('No such style')
})

test('/campfire always keeps the fire lit with no job', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  let ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: FIRE })).toBeUndefined()
  const lit = await $.command.run({ command: 'campfire', args: 'always on' } as never)
  expect(lit.text).toContain('stays lit')
  ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: FIRE })).toBeDefined()
  const bad = await $.command.run({ command: 'campfire', args: 'always maybe' } as never)
  expect(bad.text).toContain('Use /campfire always')
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
