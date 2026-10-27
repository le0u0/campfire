# campfire

Hides tool calls and shows an animated campfire above the prompt. The fire grows as Claude's to-do list gets done, and burns down when the job ends.

## Install

```
/plugin marketplace add le0u0/le0u0.ai
/plugin install campfire@le0u0.ai
```

## Use

- On by default.
- `/campfire` switches it on or off. `/campfire on` and `/campfire off` set it.
- `/campfire style` opens a pane with a live preview of the fire at full size, its number and its name. In the pane:
  - `n` and `p` go to the next and previous style.
  - `1`–`9` pick that style. For 10 and up, use `n` and `p`, or click the number.
- `/campfire style 3` picks a style by number. `/campfire style braille` picks it by the start of its name.
- `/campfire always` keeps the fire lit all the time, even when Claude is idle. `/campfire always on` and `/campfire always off` set it. While Claude works, the fire still grows and blazes as usual.
- `/campfire bigger` and `/campfire smaller` change the size of the flame, one step at a time: small, medium (default) or large. The logs stay the same size. The recorded styles (10 and 11) do not resize.
- Your on/off setting, style, size and always-lit setting are kept across sessions.

## What you see

- **Spark:** a small flame for the first moment after you send a request.
- **Steady fire:** the flame while Claude works without a to-do list.
- **Growing fire:** with a to-do list, the fire grows as steps are done. It blazes, with the biggest flame, on the last step.
- **Smoke and sparks:** they rise from the top of the flame, only once it is burning.
- **Burnt down:** when Claude finishes, or you press Esc, only the dim logs and a few embers stay. They stay until your next request. With `/campfire always` on, the fire keeps burning instead.

Every style is drawn in the same space, 21 columns wide. The height follows the flame size: 5 rows for small, 7 for medium and 10 for large. The area above the prompt only changes size when you resize the flame.

## Styles

Listed from code-like dots to recorded animation.

| # | Style | Made of |
| --- | --- | --- |
| 1 | Braille classic | dots (default) |
| 2 | Braille bonfire | dots, three tongues |
| 3 | Stick teepee | dots, sticks leaning together |
| 4 | Bonfire tower | dots, tall flame over a stick pile |
| 5 | Pixel art | chunky blocks |
| 6 | Block campfire | chunky blocks |
| 7 | Half-block realistic | smooth pixels |
| 8 | Slim tongue | smooth pixels |
| 9 | Teepee and smoke | smooth pixels |
| 10 | Cartoon stack | recorded animation |
| 11 | Wild flame | recorded animation |

Styles need a terminal with true color.

## Good to know

- Campfire asks Claude to write a to-do list for jobs with more than one step, so the fire has steps to grow with.
- It hides tool calls, tool results and the spinner while it is on. `/campfire off` shows them again.
