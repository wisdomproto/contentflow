/**
 * Generic SSE stream parser for `data: {...}\n\n` streams.
 *
 * The server-side convention used across `/api/ai/*` routes is:
 *   - Each event is a line `data: <payload>\n\n`
 *   - `<payload>` is either `[DONE]` or a JSON object such as
 *     `{ "text": "chunk" }` or `{ "error": "msg" }`.
 */

export interface SSEChunk {
  text?: string
  error?: string
}

export interface SSEStreamOptions<T = SSEChunk> {
  /** Called for each parsed JSON chunk. */
  onChunk?: (chunk: T) => void
  /** AbortSignal to cancel mid-stream. */
  signal?: AbortSignal
}

/**
 * Reads the response body and invokes `onChunk` for each `data:` line.
 * Stops on `[DONE]` or when the stream closes.  Returns the concatenated
 * `text` chunks as a convenience for callers that just need the full text.
 */
export async function parseSSEStream<T = SSEChunk>(
  response: Response,
  options: SSEStreamOptions<T> = {}
): Promise<string> {
  if (!response.body) throw new Error('스트림을 읽을 수 없습니다.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  const handle = (payload: string): boolean => {
    if (payload === '[DONE]') return true
    try {
      const parsed = JSON.parse(payload)
      const chunk = parsed as SSEChunk
      if (chunk.text) full += chunk.text
      options.onChunk?.(parsed as T)
      if (chunk.error) return true
    } catch {
      // skip malformed JSON line
    }
    return false
  }

  const processLines = (lines: string[]): boolean => {
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      if (handle(trimmed.slice(6))) return true
    }
    return false
  }

  try {
    while (true) {
      if (options.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      const { done, value } = await reader.read()
      if (done) {
        if (buffer.trim()) processLines([buffer])
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      if (processLines(lines)) break
    }
  } finally {
    reader.releaseLock()
  }

  return full
}

/**
 * Convenience wrapper for the common case: POST to an SSE endpoint and
 * resolve with the full accumulated text.  Throws on HTTP errors or on
 * any `{ error }` chunk in the stream.
 */
export async function fetchSSEText(
  url: string,
  body: unknown,
  init: { signal?: AbortSignal } = {}
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: init.signal,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  let streamError: string | null = null
  const text = await parseSSEStream(res, {
    signal: init.signal,
    onChunk: (c) => {
      if (c.error) streamError = c.error
    },
  })
  if (streamError) throw new Error(streamError)
  return text
}

/**
 * Shortcut for `POST /api/ai/generate` — the single most common callsite.
 * Returns the full concatenated text from the SSE stream.
 */
export function fetchAiGenerate(
  prompt: string,
  model?: string,
  init: { signal?: AbortSignal } = {}
): Promise<string> {
  return fetchSSEText('/api/ai/generate', { prompt, ...(model && { model }) }, init)
}

