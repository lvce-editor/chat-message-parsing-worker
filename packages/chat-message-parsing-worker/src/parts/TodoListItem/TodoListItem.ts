export type TodoListItemStatus = 'todo' | 'inProgress' | 'completed'

export interface TodoListItem {
  readonly status: TodoListItemStatus
  readonly text: string
}
