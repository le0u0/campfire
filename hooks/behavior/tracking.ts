import type { On } from 'claude-code'

import { finish, hasAgentRunning, patchBurning, readEnabled, readJob, setJob } from './state'
import { addTask, moveTask, todoSteps } from './steps'

const SYSTEM_SECTION = `# Campfire

The person sees a campfire that grows as your to-do list gets done, instead of your tool calls. For any job with more than one step, lay it out with TodoWrite (or TaskCreate) first and keep it current, so the fire can grow: the person watches it blaze when your last step starts. Mark each step completed the moment it is done.`

export function registerTracking(on: On): void {
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!(await readEnabled($))) {
      return composed
    }

    return { sections: [...composed.sections, { id: 'campfire:fire', text: SYSTEM_SECTION, scope: 'session' }] }
  })

  // A prompt lights a new fire, and so does a subagent that runs on after the main loop is done; a turn that continues a burning one keeps it.
  on('turn.start', async ($, e, next) => {
    const job = await readJob($)
    const isBurning = job !== null && job.phase === 'burning'
    const isAgent = e.agentId !== undefined
    if (!isBurning && e.text.trim() !== '' && !e.text.trimStart().startsWith('/')) {
      const startedAt = await $.clock.now()
      await setJob($, () => ({ phase: 'burning', steps: {}, isMainDone: isAgent, startedAt, finishedAt: null }))
    } else if (isBurning && !isAgent && job.isMainDone) {
      await patchBurning($, burning => ({ ...burning, isMainDone: false }))
    }

    return next(e)
  })

  on('tool.call', { tool: /^(TodoWrite|TaskCreate|TaskUpdate)$/ }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId !== undefined || ran.deny !== undefined || ran.isError) {
      return ran
    }
    if (e.tool === 'TodoWrite') {
      const steps = todoSteps(e.todos)
      await patchBurning($, job => ({ ...job, steps }))
    } else if (e.tool === 'TaskCreate') {
      const created = ran.result as { task?: { id?: string } } | undefined
      const id = created?.task?.id ?? e.tool_use_id
      await patchBurning($, job => ({ ...job, steps: addTask(job.steps, id) }))
    } else if (e.tool === 'TaskUpdate') {
      await patchBurning($, job => ({ ...job, steps: moveTask(job.steps, e.taskId, e.status) }))
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      if (e.reason !== 'aborted' && (await hasAgentRunning($))) {
        await patchBurning($, job => ({ ...job, isMainDone: true }))
      } else {
        await finish($, e.reason === 'aborted' ? 'out' : 'done')
      }
    }

    return next(e)
  })
}
