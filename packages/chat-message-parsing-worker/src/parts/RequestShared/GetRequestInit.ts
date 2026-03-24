import type { MakeApiRequestOptions } from './MakeApiRequestOptions.ts'

export const getRequestInit = (options: Readonly<MakeApiRequestOptions>): RequestInit => {
  return {
    ...(options.postBody === undefined
      ? {}
      : {
          body: JSON.stringify(options.postBody),
        }),
    ...(options.headers
      ? {
          headers: options.headers,
        }
      : {}),
    method: options.method,
  }
}
