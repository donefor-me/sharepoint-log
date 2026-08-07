/**
 * Splits a time range into smaller windows, each no larger than the specified chunk size in days.
 * This is useful for honoring API limitations (e.g., maximum 24h query window).
 *
 * @param {Date} start - The start time of the entire range.
 * @param {Date} end - The end time of the entire range.
 * @param {number} [chunkDays=1] - The maximum size of each window in days. Default is 1.
 * @returns {Array<{start: Date, end: Date}>} - An array of time windows.
 */
export function splitIntoDailyWindows(
  start: Date,
  end: Date,
  chunkDays: number = 1,
): Array<{ start: Date; end: Date }> {
  const windows: Array<{ start: Date; end: Date }> = []
  const stepMs = chunkDays * 24 * 60 * 60 * 1000

  let currentStart = start.getTime()
  const endMs = end.getTime()

  while (currentStart < endMs) {
    const currentEnd = Math.min(currentStart + stepMs, endMs)
    windows.push({
      start: new Date(currentStart),
      end: new Date(currentEnd),
    })
    currentStart = currentEnd
  }

  return windows
}
