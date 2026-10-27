import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, Timer } from 'claude-code'

import type { CampfireJob, CampfireStepStatus } from '../types'
import { DEFAULT_SIZE, DEFAULT_STYLE, drawFire, newFire, SIZES, STYLES, stepFire } from './fire'
import type { Fire, Level } from './fire'

type $ = EngineInterface

const enabledAtom = atom({ plugin: 'campfire', key: 'campfireEnabled' } as const, true)
const jobAtom = atom({ plugin: 'campfire', key: 'job' } as const, null)
const tickAtom = atom({ plugin: 'campfire', key: 'tick' } as const, 0)

const STORE_KEY = 'campfireEnabled'
const STYLE_KEY = 'campfireStyle'
const SIZE_KEY = 'campfireSize'
const ALWAYS_KEY = 'campfireAlways'
const PANE = 'campfire-styles'
const TICK_MS = 120

const SYSTEM_SECTION = `# Campfire

The person sees a campfire that grows as your to-do list gets done, instead of your tool calls. For any job with more than one step, lay it out with TodoWrite (or TaskCreate) first and keep it current, so the fire can grow: the person watches it blaze when your last step starts. Mark each step completed the moment it is done.`

const SPARK_MS = 1500

// A spark while the fire catches, then a steady fire until a to-do list exists; with one it grows with the steps done, and blazes on the last.
export function levelOf(steps: Record<string, CampfireStepStatus>, elapsed = 0): Level {
  const all = Object.values(steps)
  const done = all.filter(status => status === 'done').length
  if (all.length === 0) {
    return elapsed < SPARK_MS ? 1 : 2
  }
  if (all.length >= 2 && all.length - done <= 1) {
    return 4
  }

  return done / all.length >= 0.5 ? 3 : 2
}

let ticker: Timer | null = null
let previewTicker: Timer | null = null
let fire: Fire = newFire(DEFAULT_STYLE, DEFAULT_SIZE)
let isOn = true
let isAlwaysOn = false

// The frame clock runs while a job burns, and all the time when the fire is always on.
function syncTicker($: $, job: CampfireJob | null): void {
  const isWanted = (job !== null && job.phase === 'burning') || (isOn && isAlwaysOn)
  if (isWanted && ticker === null) {
    fire = newFire(fire.style, fire.size)
    ticker = $.clock.every(TICK_MS, async () => {
      const current = await read($, jobAtom)
      const isJob = current !== null && current.phase === 'burning'
      const level = isJob ? levelOf(current.steps, (await $.clock.now()) - current.startedAt) : 2
      stepFire(fire, isAlwaysOn ? (Math.max(level, 2) as Level) : level)
      void update($, tickAtom, tick => tick + 1)
    })
  }
  if (!isWanted && ticker !== null) {
    ticker.cancel()
    ticker = null
  }
}

async function setJob($: $, change: (job: CampfireJob | null) => CampfireJob | null): Promise<void> {
  syncTicker($, await update($, jobAtom, change))
}

function patchBurning($: $, change: (job: CampfireJob) => CampfireJob): Promise<void> {
  return setJob($, job => (job !== null && job.phase === 'burning' ? change(job) : job))
}

async function finish($: $, phase: 'done' | 'out'): Promise<void> {
  const finishedAt = await $.clock.now()
  await patchBurning($, job => ({ ...job, phase, finishedAt }))
}

async function applyStyle($: $, index: number): Promise<void> {
  fire = newFire(index, fire.size)
  await $.store.set(STYLE_KEY, index)
  await update($, tickAtom, tick => tick + 1)
}

async function applySize($: $, size: number): Promise<void> {
  fire = newFire(fire.style, size)
  await $.store.set(SIZE_KEY, size)
  await update($, tickAtom, tick => tick + 1)
}

// While the styles pane is up and no job burns, the fire in it blazes so each look can be judged.
function startPreview($: $): void {
  previewTicker ??= $.clock.every(TICK_MS, async () => {
    if (!(await $.ui.panes()).some(pane => pane.id === PANE)) {
      previewTicker?.cancel()
      previewTicker = null

      return
    }
    if (ticker === null) {
      stepFire(fire, 4)
      void update($, tickAtom, tick => tick + 1)
    }
  })
}

async function setUp($: $): Promise<void> {
  const stored = await $.store.get(STORE_KEY)
  isOn = stored !== false
  await update($, enabledAtom, () => isOn)
  isAlwaysOn = (await $.store.get(ALWAYS_KEY)) === true
  const style = await $.store.get(STYLE_KEY)
  const size = await $.store.get(SIZE_KEY)
  fire = newFire(
    typeof style === 'number' && STYLES[style] !== undefined ? style : DEFAULT_STYLE,
    typeof size === 'number' && SIZES[size] !== undefined ? size : DEFAULT_SIZE,
  )
  syncTicker($, await read($, jobAtom))
  await $.command.register({
    name: 'campfire',
    description: 'Turn Campfire on or off, keep the fire lit, resize it, or pick its look',
    argumentHint: 'on|off|always [on|off]|bigger|smaller|style [number]',
  })
}

const STATUS = { completed: 'done', in_progress: 'active' } as const

export function registerCampfire(on: On): void {
  on('session.start', async ($, e, next) => {
    await setUp($)

    return next(e)
  })

  on('command.run', { command: 'campfire' }, async ($, e) => {
    const [arg = '', choice = ''] = e.args.trim().toLowerCase().split(/\s+/, 2)
    if (arg === 'style') {
      const list = STYLES.map((style, index) => `${index + 1}. ${style.name}${index === fire.style ? ' (current)' : ''}`).join('\n')
      if (choice === '') {
        const opened = await $.ui.open({ id: PANE, title: 'Campfire styles', rows: 22, focus: true })
        if (!opened.isPlaced) {
          return { text: `Pick one with /campfire style <number>:\n${list}` }
        }
        startPreview($)

        return { text: 'Press n or p in the pane, or 1-9, to preview and use a style.' }
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
      isAlwaysOn = choice === '' ? !isAlwaysOn : choice === 'on'
      await $.store.set(ALWAYS_KEY, isAlwaysOn)
      syncTicker($, await read($, jobAtom))
      await update($, tickAtom, tick => tick + 1)

      return { text: isAlwaysOn ? 'The fire stays lit, even when Claude is idle.' : 'The fire is lit only while Claude works.' }
    }
    if (arg === 'bigger' || arg === 'smaller') {
      const size = fire.size + (arg === 'bigger' ? 1 : -1)
      if (SIZES[size] === undefined) {
        return { text: `The fire is already as ${arg === 'bigger' ? 'big' : 'small'} as it gets (${SIZES[fire.size]!.name}).` }
      }
      await applySize($, size)

      return { text: `The fire is ${SIZES[size]!.name}.` }
    }
    if (arg !== '' && arg !== 'on' && arg !== 'off') {
      return { text: 'Use /campfire on, off, always, bigger, smaller or style.' }
    }
    isOn = arg === '' ? !(await read($, enabledAtom)) : arg === 'on'
    await update($, enabledAtom, () => isOn)
    await $.store.set(STORE_KEY, isOn)
    syncTicker($, await read($, jobAtom))

    return { text: isOn ? 'Campfire is on.' : 'Campfire is off.' }
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!(await read($, enabledAtom))) {
      return composed
    }

    return { sections: [...composed.sections, { id: 'campfire:fire', text: SYSTEM_SECTION, scope: 'session' }] }
  })

  // A prompt lights a new fire; a turn that continues a burning one keeps it.
  on('turn.start', async ($, e, next) => {
    const job = await read($, jobAtom)
    const isBurning = job !== null && job.phase === 'burning'
    if (!isBurning && e.text.trim() !== '' && !e.text.trimStart().startsWith('/')) {
      const startedAt = await $.clock.now()
      await setJob($, () => ({ phase: 'burning', steps: {}, startedAt, finishedAt: null }))
    }

    return next(e)
  })

  on('tool.call', { tool: /^(TodoWrite|TaskCreate|TaskUpdate)$/ }, async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId !== undefined || ran.deny !== undefined || ran.isError) {
      return ran
    }
    const input = e as unknown as {
      todos?: { status: string }[]
      taskId?: string
      status?: string
    }
    if (e.tool === 'TodoWrite') {
      const steps = Object.fromEntries(
        (input.todos ?? []).map((todo, index): [string, CampfireStepStatus] => [
          `todo-${index}`,
          STATUS[todo.status as keyof typeof STATUS] ?? 'pending',
        ]),
      )
      await patchBurning($, job => ({ ...job, steps }))
    } else if (e.tool === 'TaskCreate') {
      const created = ran.result as { task?: { id?: string } } | undefined
      const id = `task-${created?.task?.id ?? e.tool_use_id}`
      await patchBurning($, job => ({ ...job, steps: { ...job.steps, [id]: 'pending' } }))
    } else {
      const id = `task-${input.taskId ?? ''}`
      await patchBurning($, job => {
        const { [id]: removed, ...rest } = job.steps
        if (input.status === 'deleted' || removed === undefined) {
          return { ...job, steps: rest }
        }

        return { ...job, steps: { ...rest, [id]: STATUS[input.status as keyof typeof STATUS] ?? 'pending' } }
      })
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await finish($, e.reason === 'aborted' ? 'out' : 'done')
    }

    return next(e)
  })

  on('ui.render', { component: /^(ToolUse|ToolResult|ToolGroup|Spinner|TurnDuration)$/ }, async ($, e, next) =>
    (await read($, enabledAtom)) ? <></> : next(e),
  )

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) =>
    (await read($, enabledAtom)) ? next({ ...e, props: { ...e.props, hint: '' } }) : next(e),
  )

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    void (await read($, tickAtom))
    const rows = drawFire(fire, true)
    const go = (index: number) => void applyStyle($, (index + STYLES.length) % STYLES.length)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Button key="previous" hotkey="p" onPress={() => go(fire.style - 1)}>
            <Text dimColor>[p] previous  </Text>
          </Button>
          <Button key="next" hotkey="n" onPress={() => go(fire.style + 1)}>
            <Text dimColor>[n] next  </Text>
          </Button>
          <Text dimColor>[1-9] pick, or click a number</Text>
        </Box>
        <Box flexDirection="row" flexWrap="wrap">
          {STYLES.map((style, index) => (
            <Button key={`style-${index}`} hotkey={index < 9 ? String(index + 1) : undefined} onPress={() => go(index)}>
              <Text bold={index === fire.style} color={index === fire.style ? 'success' : undefined} dimColor={index !== fire.style}>
                {index === fire.style ? `[${index + 1}]` : ` ${index + 1} `}
              </Text>
            </Button>
          ))}
        </Box>
        <Text bold color="success">
          {fire.style + 1}. {STYLES[fire.style]!.name}
        </Text>
        <Box flexDirection="column" flexShrink={0} marginTop={1}>
          {rows.map((row, index) => (
            <Text key={`row-${index}`} wrap="truncate-end">
              {row.map((cell, column) => (
                <Text key={`cell-${column}`} color={cell.color === '' ? undefined : cell.color} backgroundColor={cell.background}>
                  {cell.char}
                </Text>
              ))}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const isEnabled = await read($, enabledAtom)
    const job = isEnabled ? await read($, jobAtom) : null
    if (!isEnabled || (job === null && !isAlwaysOn)) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    // Rows from later plugins, like the context tracker, stay below the fire.
    const below = await next(e)
    // `tick` redraws the fire; the heat itself moves in the ticker.
    void (await read($, tickAtom))
    const rows = drawFire(fire, isAlwaysOn || job?.phase === 'burning')

    return (
      <Box flexDirection="column">
        <Box flexDirection="column">
          {rows.map((row, index) => (
            <Text key={`row-${index}`}>
              {row.map((cell, column) => (
                <Text key={`cell-${column}`} color={cell.color === '' ? undefined : cell.color} backgroundColor={cell.background}>
                  {cell.char}
                </Text>
              ))}
            </Text>
          ))}
        </Box>
        {below}
      </Box>
    )
  })
}
