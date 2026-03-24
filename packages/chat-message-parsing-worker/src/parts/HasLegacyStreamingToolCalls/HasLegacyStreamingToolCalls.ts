export const hasLegacyStreamingToolCalls = (parsed: unknown): boolean => {
  if (!parsed || typeof parsed !== 'object') {
    return false
  }
  const choices = Reflect.get(parsed, 'choices')
  if (!Array.isArray(choices) || choices.length === 0) {
    return false
  }
  const firstChoice = choices[0]
  if (!firstChoice || typeof firstChoice !== 'object') {
    return false
  }
  const delta = Reflect.get(firstChoice, 'delta')
  if (!delta || typeof delta !== 'object') {
    return false
  }
  const toolCalls = Reflect.get(delta, 'tool_calls')
  return Array.isArray(toolCalls) && toolCalls.length > 0
}
