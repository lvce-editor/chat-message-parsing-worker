interface ParsedAskQuestionArguments {
  readonly answers: readonly string[]
  readonly question: string
}

export const parseAskQuestionArguments = (rawArguments: string): ParsedAskQuestionArguments => {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawArguments) as unknown
  } catch {
    return {
      answers: [],
      question: '',
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      answers: [],
      question: '',
    }
  }
  const question = Reflect.get(parsed, 'question')
  const rawAnswers = Reflect.get(parsed, 'answers')
  const rawChoices = Reflect.get(parsed, 'choices')
  const rawOptions = Reflect.get(parsed, 'options')
  const arrayValue = Array.isArray(rawAnswers) ? rawAnswers : Array.isArray(rawChoices) ? rawChoices : Array.isArray(rawOptions) ? rawOptions : []
  const answers = arrayValue.filter((value) => typeof value === 'string') as readonly string[]
  return {
    answers,
    question: typeof question === 'string' ? question : '',
  }
}
