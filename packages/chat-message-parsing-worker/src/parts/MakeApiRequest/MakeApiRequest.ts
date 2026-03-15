import type { MakeApiRequestOptions } from '../RequestShared/MakeApiRequestOptions.ts'
import { getFetchThrownErrorResult } from '../RequestShared/GetFetchThrownErrorResult.ts'
import { getHeadersObject } from '../RequestShared/GetHeadersObject.ts'
import { getRequestInit } from '../RequestShared/GetRequestInit.ts'

export interface ApiRequestErrorResult {
  readonly headers: Record<string, string>
  readonly response: string
  readonly statusCode: number
  readonly type: 'error'
}

export interface ApiRequestSuccessResult {
  readonly body: unknown
  readonly headers: Record<string, string>
  readonly statusCode: number
  readonly type: 'success'
}

export type ApiRequestResult = ApiRequestSuccessResult | ApiRequestErrorResult

const parseResponseJson = (responseText: string): unknown => {
  if (!responseText) {
    return null
  }
  return JSON.parse(responseText) as unknown
}

export const makeApiRequest = async (options: Readonly<MakeApiRequestOptions>): Promise<ApiRequestResult> => {
  let response: Response
  try {
    response = await fetch(options.url, getRequestInit(options))
  } catch (error) {
    return getFetchThrownErrorResult(error)
  }

  const headers = getHeadersObject(response.headers)
  const responseText = await response.text()

  if (!response.ok) {
    return {
      headers,
      response: responseText,
      statusCode: response.status,
      type: 'error',
    }
  }

  let parsed: unknown
  try {
    parsed = parseResponseJson(responseText)
  } catch {
    return {
      headers,
      response: responseText,
      statusCode: response.status,
      type: 'error',
    }
  }

  return {
    body: parsed,
    headers,
    statusCode: response.status,
    type: 'success',
  }
}
