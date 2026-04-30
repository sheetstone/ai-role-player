import { useState } from 'react'

/**
 * Manages a string↔array field pair used in admin forms where users type
 * delimited text (e.g. newline-separated goals, comma-separated traits) that
 * must be stored as a `string[]` in the domain model.
 *
 * @param initial - The initial array value, usually from the entity being edited.
 * @param separator - The delimiter used to join for display and split on submit.
 *
 * @returns A tuple of `[text, setText, parse]`:
 *   - `text` — the current string value to bind to the input/textarea
 *   - `setText` — onChange handler setter
 *   - `parse` — call on submit to convert `text` back to a trimmed, non-empty array
 *
 * @example
 * const [goalsText, setGoalsText, parseGoals] = useArrayField(initial?.goals ?? [], '\n')
 * // in JSX: <textarea value={goalsText} onChange={e => setGoalsText(e.target.value)} />
 * // on submit: const goals = parseGoals()
 */
export function useArrayField(
  initial: string[],
  separator: string,
): [string, (value: string) => void, () => string[]] {
  const [text, setText] = useState(() => initial.join(separator))
  const parse = () => text.split(separator).map(s => s.trim()).filter(Boolean)
  return [text, setText, parse]
}
