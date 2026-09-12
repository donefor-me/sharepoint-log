import { AsyncLocalStorage } from 'async_hooks'

export const loggerContext = new AsyncLocalStorage<{ traceId: string }>()

export function getTraceId(): string | undefined {
  return loggerContext.getStore()?.traceId
}
