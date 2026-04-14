/**
 * Shared helpers for `/api/*` route handlers: JSON error responses,
 * environment-variable guards, and SSE stream utilities.
 */

export function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Assert that all required env vars exist.  Returns `null` on success,
 * or a 500 `Response` on the first missing variable.
 */
export function requireEnv(...names: string[]): Response | null {
  for (const name of names) {
    if (!process.env[name]) {
      return jsonError(`${name} 환경변수가 설정되지 않았습니다.`, 500)
    }
  }
  return null
}

/** Wrap an async handler; convert thrown errors into a 500 JSON response. */
export async function handleRouteErrors(
  fn: () => Promise<Response>
): Promise<Response> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.'
    return jsonError(msg, 500)
  }
}

/** Standard headers for an SSE `text/event-stream` response. */
export const SSE_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
}

/**
 * Returns true if the provider error looks like a transient overload
 * (503 / high demand / overloaded).  Used to decide whether to retry.
 */
export function isTransientProviderError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  )
}
