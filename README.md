# campfire

Light a fire while Claude works. Tool calls fade away, and a campfire crackles above your prompt, growing with every step Claude finishes and burning down to embers when the job is done.

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
| `/campfire always [on\|off]` | Keep the fire lit even when Claude is idle; with no argument, toggle it |
| `/campfire bigger`, `/campfire smaller` | Resize the flame: small, medium (default) or large |

## What you see

| Moment | Fire |
| --- | --- |
| You send a request | A small spark catches |
| Claude works | A steady flame |
| Claude finishes steps | The flame grows with each one |
| Last step | The biggest flame, with smoke and sparks rising |
| Job done, or you press Esc | Dim logs and a few embers, until your next request |

With `/campfire always` on, the fire keeps burning instead of dying down.

## Styles

| # | Style | Look | Fire |
| --- | --- | --- | --- |
| 1 | Classic | Dot | Crossed logs (default) |
| 2 | Pyre | Dot | A tall flame over a stack of sticks |
| 3 | Teepee | Pixel | A teepee of logs under rising smoke |
| 4 | Torch | Pixel | A single flame on a pole |

