import type { Turn, KeyMoment } from '../../types'
import styles from './TranscriptViewer.module.css'

interface TranscriptViewerProps {
  turns: Turn[]
  sessionStartedAt: number
  keyMoments: KeyMoment[]
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m}:${sec.toString().padStart(2, '0')}`
}

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
