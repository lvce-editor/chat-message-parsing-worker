import type { ApiRequestErrorResult } from '../MakeApiRequest/MakeApiRequest.ts'
import type { MakeApiRequestOptions } from '../RequestShared/MakeApiRequestOptions.ts'
import { getFetchThrownErrorResult } from '../RequestShared/GetFetchThrownErrorResult.ts'
import { getHeadersObject } from '../RequestShared/GetHeadersObject.ts'
import { getRequestInit } from '../RequestShared/GetRequestInit.ts'

export interface StreamingApiRequestSuccessResult {
  readonly body: readonly unknown[]
  readonly headers: Record<string, string>
  readonly statusCode: number
  readonly type: 'success'
}

export type StreamingApiRequestResult = StreamingApiRequestSuccessResult | ApiRequestErrorResult

const splitSseEvents = (chunk: string): string[] => {
  return chunk.split(/\r?\n\r?\n/)
}

const getSseDataLines = (event: string): readonly string[] => {
  const lines = event.split(/\r?\n/)
  const dataLines: string[] = []
  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue
    }
    dataLines.push(line.slice(5).trimStart())
  }
  return dataLines
}

const parseSseData = (text: string): unknown => {
  if (text === '[DONE]') {
    return text
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

const parseSseFromReader = async (responseBody: Readonly<ReadableStream<Uint8Array>> | null): Promise<readonly unknown[]> => {
  if (!responseBody) {
    return []
  }

  const reader = responseBody.getReader()
  const decoder = new TextDecoder()
  let remainder = ''
  const events: unknown[] = []
  let done = false

  while (!done) {
    const { done: streamDone, value } = await reader.read()
    if (streamDone) {
      done = true
    } else if (value) {
      remainder += decoder.decode(value, { stream: true })
    }

    const chunks = splitSseEvents(remainder)
    remainder = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const dataLines = getSseDataLines(chunk)
      for (const line of dataLines) {
        events.push(parseSseData(line))
      }
    }
  }

  if (remainder) {
    const dataLines = getSseDataLines(remainder)
    for (const line of dataLines) {
      events.push(parseSseData(line))
    }
  }

  return events
}

export const makeStreamingApiRequest = async (options: Readonly<MakeApiRequestOptions>): Promise<StreamingApiRequestResult> => {
  let response: Response
  try {
    response = await fetch(options.url, getRequestInit(options))
  } catch (error) {
    return getFetchThrownErrorResult(error)
  }

  const headers = getHeadersObject(response.headers)
  if (!response.ok) {
    const responseText = await response.text()
    return {
      headers,
      response: responseText,
      statusCode: response.status,
      type: 'error',
    }
  }

  const body = await parseSseFromReader(response.body)
  return {
    body,
    headers,
    statusCode: response.status,
    type: 'success',
  }
}
