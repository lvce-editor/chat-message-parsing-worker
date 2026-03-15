type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export interface MakeApiRequestOptions {
  readonly headers?: Readonly<Record<string, string>>
  readonly method: string
  readonly postBody?: JsonValue
  readonly url: string
}
