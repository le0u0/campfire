export type CampfireStepStatus = 'done' | 'active' | 'pending'

export type CampfirePhase = 'burning' | 'done' | 'out'

export type CampfireJob = {
  phase: CampfirePhase
  steps: Record<string, CampfireStepStatus>
  startedAt: number
  finishedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    campfire: {
      campfireEnabled: boolean
      job: CampfireJob | null
      tick: number
    }
  }
}
