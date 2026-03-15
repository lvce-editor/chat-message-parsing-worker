import { expect, test } from '@jest/globals'
import { makeApiRequest } from '../src/parts/MakeApiRequest/MakeApiRequest.ts'
import { makeStreamingApiRequest } from '../src/parts/MakeStreamingApiRequest/MakeStreamingApiRequest.ts'

const getReadableStream = (chunks: readonly string[]): ReadableStream<Uint8Array> => {
  return new ReadableStream<Uint8Array>({
    start(controller: Readonly<ReadableStreamDefaultController<Uint8Array>>): void {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk))
      }
      controller.close()
    },
  })
}

test('makeApiRequest should return parsed json on success', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      headers: new Headers({
        'content-type': 'application/json',
      }),
      ok: true,
      status: 200,
      text: async () => '{"message":"ok"}',
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await makeApiRequest({
      method: 'POST',
      postBody: {
        ping: true,
      },
      url: 'https://example.com/v1/chat/completions',
    })
    expect(result).toEqual({
      body: {
        message: 'ok',
      },
      headers: {
        'content-type': 'application/json',
      },
      statusCode: 200,
      type: 'success',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('makeApiRequest should return error object when http request fails', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      headers: new Headers({
        'content-type': 'text/plain',
      }),
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await makeApiRequest({
      method: 'GET',
      url: 'https://example.com/v1/chat/completions',
    })
    expect(result).toEqual({
      headers: {
        'content-type': 'text/plain',
      },
      response: 'unauthorized',
      statusCode: 401,
      type: 'error',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('makeApiRequest should return error object when fetch throws', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new Error('network failure')
  }) as typeof globalThis.fetch

  try {
    const result = await makeApiRequest({
      method: 'GET',
      url: 'https://example.com/v1/chat/completions',
    })
    expect(result).toEqual({
      headers: {},
      response: 'network failure',
      statusCode: 0,
      type: 'error',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('makeStreamingApiRequest should parse server side events', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      body: getReadableStream(['data: {"id":"1"}\n\n', 'event: ping\n', 'data: plain text\n\n', 'data: [DONE]\n\n']),
      headers: new Headers({
        'content-type': 'text/event-stream',
      }),
      ok: true,
      status: 200,
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await makeStreamingApiRequest({
      method: 'POST',
      postBody: {
        stream: true,
      },
      url: 'https://example.com/v1/chat/completions?stream=true',
    })
    expect(result).toEqual({
      body: [{ id: '1' }, 'plain text', '[DONE]'],
      headers: {
        'content-type': 'text/event-stream',
      },
      statusCode: 200,
      type: 'success',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('makeStreamingApiRequest should return error object for non-ok status', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return {
      headers: new Headers({
        'content-type': 'application/json',
      }),
      ok: false,
      status: 500,
      text: async () => '{"error":"failed"}',
    } as Response
  }) as typeof globalThis.fetch

  try {
    const result = await makeStreamingApiRequest({
      method: 'POST',
      url: 'https://example.com/v1/chat/completions?stream=true',
    })
    expect(result).toEqual({
      headers: {
        'content-type': 'application/json',
      },
      response: '{"error":"failed"}',
      statusCode: 500,
      type: 'error',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
