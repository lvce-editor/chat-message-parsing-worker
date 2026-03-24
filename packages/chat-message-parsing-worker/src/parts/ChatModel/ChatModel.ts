export interface ChatModel {
  readonly id: string
  readonly name: string
  readonly provider?: 'test' | 'openRouter' | 'openApi' | 'openAI' | 'openai'
  readonly usageCost?: number
}
