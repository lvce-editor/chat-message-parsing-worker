import type { TodoListItem, TodoListItemStatus } from '../TodoListItem/TodoListItem.ts'

const isTodoStatus = (status: unknown): status is TodoListItemStatus => {
  return status === 'todo' || status === 'inProgress' || status === 'completed'
}

export const parseTodoListArguments = (rawArguments: string): readonly TodoListItem[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawArguments) as unknown
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== 'object') {
    return []
  }
  const rawTodos = Reflect.get(parsed, 'todos')
  if (!Array.isArray(rawTodos)) {
    return []
  }
  const todos: TodoListItem[] = []
  for (const rawTodo of rawTodos) {
    if (!rawTodo || typeof rawTodo !== 'object') {
      continue
    }
    const text = Reflect.get(rawTodo, 'text')
    const status = Reflect.get(rawTodo, 'status')
    if (typeof text !== 'string' || !isTodoStatus(status)) {
      continue
    }
    todos.push({
      status,
      text,
    })
  }
  return todos
}
