import type { On } from 'claude-code'

import { SIZES, STYLES } from '../flame'
import { applySize, applyStyle, bumpTick, PANE, readEnabled, readJob, session, setAlways, setEnabled, syncTicker } from './state'

export function registerCommand(on: On): void {
  on('command.run', { command: 'campfire' }, async ($, e) => {
    const [arg = '', choice = ''] = e.args.trim().toLowerCase().split(/\s+/, 2)
    if (arg === 'style') {
      const list = STYLES.map((style, index) => `${index + 1}. ${style.name}${index === session.fire.style ? ' (current)' : ''}`).join('\n')
      if (choice === '') {
        const opened = await $.ui.open({ id: PANE, title: 'Campfire styles', rows: 3, focus: true })
        if (!opened.isPlaced) {
          return { text: `Pick one with /campfire style <number>:\n${list}` }
        }

        return { text: 'Press 1-9 in the pane, or click a number, to pick a style.' }
      }
      const index = /^\d+$/.test(choice) ? Number(choice) - 1 : STYLES.findIndex(style => style.name.toLowerCase().startsWith(choice))
      if (STYLES[index] === undefined) {
        return { text: `No such style. Pick one with /campfire style <number>:\n${list}` }
      }
      await applyStyle($, index)

      return { text: `Campfire style is ${index + 1}. ${STYLES[index].name}.` }
    }
    if (arg === 'always') {
      if (choice !== '' && choice !== 'on' && choice !== 'off') {
        return { text: 'Use /campfire always on, /campfire always off, or /campfire always to switch.' }
      }
      await setAlways($, choice === '' ? !session.isAlwaysOn : choice === 'on')
      syncTicker($, await readJob($))
      await bumpTick($)

      return { text: session.isAlwaysOn ? 'The fire stays lit, even when Claude is idle.' : 'The fire is lit only while Claude works.' }
    }
    if (arg === 'bigger' || arg === 'smaller') {
      const size = session.fire.size + (arg === 'bigger' ? 1 : -1)
      if (SIZES[size] === undefined) {
        return { text: `The fire is already as ${arg === 'bigger' ? 'big' : 'small'} as it gets (${SIZES[session.fire.size]!.name}).` }
      }
      await applySize($, size)

      return { text: `The fire is ${SIZES[size]!.name}.` }
    }
    if (arg !== '' && arg !== 'on' && arg !== 'off') {
      return { text: 'Use /campfire on, off, always, bigger, smaller or style.' }
    }
    await setEnabled($, arg === '' ? !(await readEnabled($)) : arg === 'on')
    syncTicker($, await readJob($))

    return { text: session.isOn ? 'Campfire is on.' : 'Campfire is off.' }
  })
}
