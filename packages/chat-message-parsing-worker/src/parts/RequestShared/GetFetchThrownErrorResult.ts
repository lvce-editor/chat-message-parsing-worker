import type { ApiRequestErrorResult } from '../MakeApiRequest/MakeApiRequest.ts'
import { getFetchErrorMessage } from './GetFetchErrorMessage.ts'

export const getFetchThrownErrorResult = (error: unknown): ApiRequestErrorResult => {
  return {
    headers: {},
    response: getFetchErrorMessage(error),
    statusCode: 0,
    type: 'error',
  }
}
