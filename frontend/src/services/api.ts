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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { request }
