import type { ApiError } from '../types'

export class ApiRequestError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as ApiError
    throw new ApiRequestError(res.status, body.error ?? res.statusText)
  }

  return res.json() as Promise<T>
}

export async function retryRequest<T>(
  path: string,
  init?: RequestInit,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request<T>(path, init)
    } catch (err) {
      lastError = err
      if (err instanceof ApiRequestError && err.status < 500) throw err
      if (attempt < maxRetries) await delay(1000 * attempt)
    }
  }
  throw lastError
}

// Raw fetch with silent retry for binary/streaming endpoints (STT, TTS).
// Aborts are never retried. 4xx client errors are never retried.
export async function retryFetch(
  url: string,
  options: RequestInit,
  maxAttempts = 2
): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await delay(1000)
    try {
      const res = await fetch(url, options)
      if (res.status < 500) return res   // success or permanent client error
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (err: any) {
      if (err.name === 'AbortError') throw err
      lastErr = err
    }
  }
  throw lastErr
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { request }
