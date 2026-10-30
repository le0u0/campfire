import { expect, test } from 'claude-code/testing'

import { addTask, moveTask, todoSteps } from './steps'

test('a to-do list numbers its steps by place', () => {
  expect(todoSteps([{ status: 'completed' }, { status: 'in_progress' }, { status: 'pending' }])).toEqual({
    'todo-0': 'done',
    'todo-1': 'active',
    'todo-2': 'pending',
  })
  expect(todoSteps([])).toEqual({})
})

test('tasks are added, moved along and deleted', () => {
  let steps = addTask({}, '7')
  expect(steps).toEqual({ 'task-7': 'pending' })
  steps = moveTask(steps, '7', 'in_progress')
  expect(steps).toEqual({ 'task-7': 'active' })
  steps = moveTask(steps, '7', 'completed')
  expect(steps).toEqual({ 'task-7': 'done' })
  steps = moveTask(steps, '7', 'deleted')
  expect(steps).toEqual({})
})

test('an update for a task the list never saw changes nothing', () => {
  expect(moveTask({ 'task-1': 'done' }, '9', 'completed')).toEqual({ 'task-1': 'done' })
})
