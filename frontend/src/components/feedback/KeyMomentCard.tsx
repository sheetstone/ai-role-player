import type { KeyMoment } from '../../types'
import styles from './KeyMomentCard.module.css'

interface KeyMomentCardProps {
  moment: KeyMoment
  turnText?: string
}

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
