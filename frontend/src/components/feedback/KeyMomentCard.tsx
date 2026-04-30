import type { KeyMoment } from '../../types'
import styles from './KeyMomentCard.module.css'

interface KeyMomentCardProps {
  /** The key moment data from the AI feedback — type ('good'/'improvement'), label, and explanation. */
  moment: KeyMoment
  /** The actual text the learner or AI said during this moment. Shown as a blockquote if provided. */
  turnText?: string
}

/**
 * A card highlighting a specific moment in the session that was either
 * particularly good or needs improvement.
 *
 * "Good practice" cards use a green style, "Needs improvement" cards use amber.
 * When `turnText` is provided, the quoted speech is shown so the learner can
 * relate the coaching feedback back to what was actually said.
 */

export default function KeyMomentCard({ moment, turnText }: KeyMomentCardProps) {
  const isGood = moment.type === 'good'

  return (
    <div className={`${styles.card} ${isGood ? styles.cardGood : styles.cardImprovement}`}>
      <span className={`${styles.badge} ${isGood ? styles.badgeGood : styles.badgeImprovement}`}>
        {isGood ? 'Good practice' : 'Needs improvement'}
      </span>
      <p className={styles.label}>{moment.label}</p>
      <p className={styles.explanation}>{moment.explanation}</p>
      {turnText && (
        <blockquote className={styles.quote}>{turnText}</blockquote>
      )}
    </div>
  )
}
