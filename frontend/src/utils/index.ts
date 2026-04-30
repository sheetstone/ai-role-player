/**
 * Formats a duration in total seconds as MM:SS.
 *
 * Used for the recording timer which counts from 0 to 30 seconds.
 *
 * @param totalSeconds - Number of whole seconds to format.
 * @returns A string like "00:00", "01:30", etc.
 *
 * @example
 * formatDuration(90)  // "01:30"
 * formatDuration(5)   // "00:05"
 */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Formats a duration in milliseconds as HH:MM:SS.
 *
 * Used for turn timestamps in the transcript (time since session start) and
 * for the total session duration on the feedback page.
 *
 * @param ms - Duration in milliseconds (e.g. `turn.timestamp - session.startedAt`).
 * @returns A string like "00:00:00", "00:02:34", "01:15:09".
 *
 * @example
 * formatElapsed(0)        // "00:00:00"
 * formatElapsed(90_000)   // "00:01:30"
 * formatElapsed(3661_000) // "01:01:01"
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':')
}

/**
 * Converts a display name into a URL- and filename-safe slug (lowercase,
 * spaces replaced with hyphens, truncated to `maxLength`).
 *
 * Used to derive safe export filenames from scenario names.
 *
 * @param text - The display name to slugify.
 * @param maxLength - Maximum length of the output. Defaults to 30.
 * @returns A lowercase hyphenated string.
 *
 * @example
 * slugify('Cold Call Training')   // "cold-call-training"
 * slugify('Very Long Scenario Name Here', 10) // "very-long-"
 */
export function slugify(text: string, maxLength = 30): string {
  return text.toLowerCase().replace(/\s+/g, '-').slice(0, maxLength)
}
