import type { VirtualDomNode } from '@lvce-editor/virtual-dom-worker'

export type MessageIntermediateNode =
  | MessageTextNode
  | MessageHeadingNode
  | MessageOrderedListNode
  | MessageUnorderedListNode
  | MessageTableNode
  | MessageCodeBlockNode
  | MessageMathBlockNode
  | MessageMathBlockDomNode

export type MessageInlineNode =
  | MessageInlineTextNode
  | MessageInlineLinkNode
  | MessageInlineBoldNode
  | MessageInlineItalicNode
  | MessageMathInlineNode
  | MessageMathInlineDomNode

export interface MessageInlineTextNode {
  readonly text: string
  readonly type: 'text'
}

export interface MessageInlineLinkNode {
  readonly href: string
  readonly text: string
  readonly type: 'link'
}

export interface MessageInlineBoldNode {
  readonly children: readonly MessageInlineNode[]
  readonly type: 'bold'
}

export interface MessageInlineItalicNode {
  readonly children: readonly MessageInlineNode[]
  readonly type: 'italic'
}

export interface MessageMathInlineNode {
  readonly displayMode: boolean
  readonly text: string
  readonly type: 'math-inline'
}

export interface MessageMathInlineDomNode {
  readonly dom: readonly VirtualDomNode[]
  readonly type: 'math-inline-dom'
}

export interface MessageTextNode {
  readonly children: readonly MessageInlineNode[]
  readonly type: 'text'
}

export interface MessageHeadingNode {
  readonly children: readonly MessageInlineNode[]
  readonly level: 1 | 2 | 3 | 4 | 5 | 6
  readonly type: 'heading'
}

export interface MessageOrderedListNode {
  readonly items: readonly MessageListItemNode[]
  readonly type: 'ordered-list'
}

export interface MessageUnorderedListNode {
  readonly items: readonly MessageListItemNode[]
  readonly type: 'unordered-list'
}

export interface MessageListItemNode {
  readonly children: readonly MessageInlineNode[]
  readonly nestedItems?: readonly MessageListItemNode[]
  readonly type: 'list-item'
}

export interface MessageTableNode {
  readonly headers: readonly MessageTableCellNode[]
  readonly rows: readonly MessageTableRowNode[]
  readonly type: 'table'
}

export interface MessageTableCellNode {
  readonly children: readonly MessageInlineNode[]
  readonly type: 'table-cell'
}

export interface MessageTableRowNode {
  readonly cells: readonly MessageTableCellNode[]
  readonly type: 'table-row'
}

export interface MessageCodeBlockNode {
  readonly language?: string
  readonly text: string
  readonly type: 'code-block'
}

export interface MessageMathBlockNode {
  readonly text: string
  readonly type: 'math-block'
}

export interface MessageMathBlockDomNode {
  readonly dom: readonly VirtualDomNode[]
  readonly type: 'math-block-dom'
}
