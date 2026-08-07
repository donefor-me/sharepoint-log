import { HttpStatus } from '@nestjs/common'

/** Axios error codes that indicate a transient network-level failure. */
const TRANSIENT_NETWORK_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ECONNABORTED',
  'EAI_AGAIN',
]

/**
 * Executes an async function with Exponential Backoff and Jitter.
 * Respects the 'Retry-After' header if Microsoft returns a 429 Rate Limit error.
 *
 * @param fn - The async function to execute.
 * @param options - Custom configuration for maxRetries and baseDelayMs.
 * @returns The result of the executed function.
 * @throws If max retries are exceeded or a non-transient error occurs.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 4, baseDelayMs = 500, maxJitterMs = 200 } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const status = err?.response?.status
      const isHttpTransient =
        status === HttpStatus.TOO_MANY_REQUESTS ||
        (status >= HttpStatus.INTERNAL_SERVER_ERROR && status < 600)
      const isNetworkTransient =
        !status && TRANSIENT_NETWORK_CODES.includes(err?.code)

      if ((!isHttpTransient && !isNetworkTransient) || attempt >= maxRetries)
        throw err

      const retryAfterHeader = err?.response?.headers?.['retry-after']
      const delay = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : baseDelayMs * 2 ** attempt + Math.random() * maxJitterMs

      await new Promise((res) => setTimeout(res, delay))
    }
  }
}
