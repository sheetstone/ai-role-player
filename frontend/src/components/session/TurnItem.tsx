import type { Turn } from '../../types'
import { formatElapsed } from '../../utils'
import styles from './TranscriptPanel.module.css'

interface TurnItemProps {
  /** The turn data — speaker, text, timestamp, and whether it's still streaming (partial). */
  turn: Turn
  /** Unix timestamp (ms) when the session started. Used to display the relative elapsed time. */
  sessionStartedAt: number
  /** Highlights this turn when the AI is currently speaking it aloud. Defaults to false. */
  isActive?: boolean
}

/**
 * Renders a single conversation turn as a chat bubble. User turns are
 * right-aligned, persona turns left-aligned.
 *
 * While the turn is still streaming (`turn.partial === true`), a blinking
 * cursor is shown after the text. When streaming ends, the cursor disappears
 * and the final text is set.
 */

export default function TurnItem({ turn, sessionStartedAt, isActive = false }: TurnItemProps) {
  const isUser = turn.speaker === 'user'

  return (
    <li
      className={`${styles.turn} ${isUser ? styles.turnUser : styles.turnPersona} ${isActive ? styles.turnActive : ''}`}
    >
      <div className={styles.turnMeta}>
        <span className={styles.speaker}>{isUser ? 'You' : 'Persona'}</span>
        <time className={styles.timestamp}>
          {formatElapsed(turn.timestamp - sessionStartedAt)}
        </time>
      </div>

      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubblePersona} ${isActive ? styles.bubbleActive : ''}`}>
        <span className={styles.text}>
          {turn.text || (turn.partial ? '' : '—')}
        </span>
        {turn.partial && <span className={styles.cursor} aria-hidden="true" />}
      </div>
    </li>
  )
}
