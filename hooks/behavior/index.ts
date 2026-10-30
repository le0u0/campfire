import type { On } from 'claude-code'

import { registerCommand } from './command'
import { registerRender } from './render'
import { setUp } from './state'
import { registerTracking } from './tracking'

export { levelOf } from './level'

export function registerCampfire(on: On): void {
  on('session.start', async ($, e, next) => {
    await setUp($)

    return next(e)
  })
  registerCommand(on)
  registerTracking(on)
  registerRender(on)
}
