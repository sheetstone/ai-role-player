import type { Turn, KeyMoment } from '../../types'
import { formatElapsed } from '../../utils'
import styles from './TranscriptViewer.module.css'

interface TranscriptViewerProps {
  /** All completed (non-partial) turns from the session. */
  turns: Turn[]
  /** Unix timestamp (ms) when the session started — used to compute relative elapsed times. */
  sessionStartedAt: number
  /** Key moments from the AI feedback. Turns that match a key moment get a colored highlight and inline badge. */
  keyMoments: KeyMoment[]
}

/**
 * Read-only transcript shown on the feedback page. Unlike `TranscriptPanel`
 * (which streams live during the session), this renders all completed turns
 * at once without auto-scroll.
 *
 * Turns that are linked to a key moment are highlighted: green for "good
 * practice" and amber for "needs improvement", with an inline badge showing
 * the moment's label so the learner can see exactly which part of their speech
 * the feedback refers to.
 */

export default function TranscriptViewer({ turns, sessionStartedAt, keyMoments }: TranscriptViewerProps) {
  const momentMap = new Map(keyMoments.map(m => [m.turnId, m]))

  if (turns.length === 0) {
    return <p className={styles.empty}>No transcript available.</p>
  }

  return (
    <div className={styles.viewer} role="log" aria-label="Session transcript">
      <ul className={styles.list}>
        {turns.map((turn) => {
          const moment = momentMap.get(turn.id)
          const isUser = turn.speaker === 'user'
          const elapsed = formatElapsed(turn.timestamp - sessionStartedAt)

          return (
            <li
              key={turn.id}
              data-turn-id={turn.id}
              className={`${styles.item} ${isUser ? styles.itemUser : styles.itemPersona}`}
            >
              <div className={styles.meta}>
                <span className={styles.speaker}>{isUser ? 'You' : 'Persona'}</span>
                <span className={styles.timestamp}>{elapsed}</span>
              </div>
              <div
                className={`${styles.bubble} ${
                  isUser ? styles.bubbleUser : styles.bubblePersona
                } ${
                  moment
                    ? moment.type === 'good'
                      ? styles.bubbleGood
                      : styles.bubbleImprovement
                    : ''
                }`}
              >
                {turn.text}
                {moment && (
                  <span
                    className={`${styles.inlineBadge} ${
                      moment.type === 'good' ? styles.inlineBadgeGood : styles.inlineBadgeImprovement
                    }`}
                  >
                    {moment.type === 'good' ? '✓' : '!'} {moment.label}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
