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
