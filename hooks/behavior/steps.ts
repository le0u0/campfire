import type { CampfireStepStatus } from '../../types'

type Steps = Record<string, CampfireStepStatus>

const STATUS = { completed: 'done', in_progress: 'active' } as const

const statusOf = (status: string | undefined): CampfireStepStatus => STATUS[status as keyof typeof STATUS] ?? 'pending'

// A to-do list is rewritten whole each time, so its steps are numbered by place.
export function todoSteps(todos: { status: string }[]): Steps {
  return Object.fromEntries(todos.map((todo, index): [string, CampfireStepStatus] => [`todo-${index}`, statusOf(todo.status)]))
}

export function addTask(steps: Steps, id: string): Steps {
  return { ...steps, [`task-${id}`]: 'pending' }
}

// A task the list never saw is not added by an update, and a deleted one leaves the list.
export function moveTask(steps: Steps, id: string, status: string | undefined): Steps {
  const { [`task-${id}`]: known, ...rest } = steps
  if (status === 'deleted' || known === undefined) {
    return rest
  }

  return { ...rest, [`task-${id}`]: statusOf(status) }
}
