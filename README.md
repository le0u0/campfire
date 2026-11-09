# campfire

Light a fire while Claude works. Tool calls fade away, and a campfire crackles above your prompt, growing with every step Claude finishes and going out when the job is done.

## Install

```
/plugin marketplace add le0u0/le0u0.ai
/plugin install campfire@le0u0.ai
```

## Commands

| Command | What it does |
| --- | --- |
| `/campfire [on\|off]` | Switch the fire on or off; with no argument, toggle it |
| `/campfire style [number\|name]` | Pick a style by number or the start of its name; with no argument, open a pane to pick one |

## What you see

| Moment | Fire |
| --- | --- |
| You send a request | A small spark catches |
| Claude works, or a subagent still runs | A steady flame |
| Claude finishes steps | The flame grows with each one |
| Last step | The biggest flame, with smoke and sparks rising |
| Job done, or you press Esc | The fire is gone, until your next request |

## Styles

| # | Style | Look | Fire |
| --- | --- | --- | --- |
| 1 | Teepee | Pixel | A tall flame over a fan of sticks (default) |
| 2 | Torch | Pixel | A single flame on a pole |

