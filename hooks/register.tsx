import type { Register } from 'claude-code'

import { registerCampfire } from './campfire'

export const register: Register = on => {
  registerCampfire(on)
}
