import type { Register } from 'claude-code'

import { registerCampfire } from './behavior'

export const register: Register = on => {
  registerCampfire(on)
}
