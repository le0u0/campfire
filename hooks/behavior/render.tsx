import type { On } from 'claude-code'

import { drawFire, STYLES } from '../flame'
import { applyStyle, PANE, readEnabled, readJob, readTick, session } from './state'

export function registerRender(on: On): void {
  on('ui.render', { component: /^(ToolUse|ToolResult|ToolGroup|Spinner|TurnDuration)$/ }, async ($, e, next) =>
    (await readEnabled($)) ? <></> : next(e),
  )

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) =>
    (await readEnabled($)) ? next({ ...e, props: { ...e.props, hint: '' } }) : next(e),
  )

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    void (await readTick($))
    const { fire } = session
    const go = (index: number) => void applyStyle($, (index + STYLES.length) % STYLES.length)

    return (
      <Box flexDirection="column">
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
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const isEnabled = await readEnabled($)
    const job = isEnabled ? await readJob($) : null
    if (!isEnabled || (job === null && !session.isAlwaysOn)) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    // Rows from later plugins, like the context tracker, stay below the fire.
    const below = await next(e)
    // `tick` redraws the fire; the heat itself moves in the ticker.
    void (await readTick($))
    const rows = drawFire(session.fire, session.isAlwaysOn || job?.phase === 'burning')

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
