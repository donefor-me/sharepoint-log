/**
 * Splits an array into multiple smaller chunks of a specified maximum size.
 *
 * @template T
 * @param {T[]} array - The input array to be chunked.
 * @param {number} size - The maximum number of elements per chunk.
 * @returns {T[][]} An array containing the chunked arrays.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

/**
 * Runs an array of async task factories with a bounded concurrency limit.
 * Unlike chunk-based approaches, this maintains N concurrent slots at all times —
 * as soon as one resolves, the next task is immediately started.
 *
 * @template T
 * @param {Array<() => Promise<T>>} tasks - An array of zero-argument functions that return Promises.
 * @param {number} limit - Maximum number of Promises to run concurrently.
 * @returns {Promise<PromiseSettledResult<T>[]>} A Promise that resolves to an array of PromiseSettledResults in input order.
 */
export async function runPool<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  )
  return results
}
