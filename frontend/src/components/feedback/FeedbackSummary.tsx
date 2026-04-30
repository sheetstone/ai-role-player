import type { FeedbackResult } from '../../types'
import styles from './FeedbackSummary.module.css'

interface FeedbackSummaryProps {
  /** The AI-generated feedback returned by the backend after a session ends. */
  feedback: FeedbackResult
}

/**
 * Displays the AI-generated feedback for the completed session in three sections:
 * 1. **Overall Assessment** — a paragraph summary of the learner's performance
 * 2. **Strengths / Areas to Improve** — two side-by-side bullet lists
 * 3. **Coaching Tips** — numbered action items the learner can apply next time
 */

export default function FeedbackSummary({ feedback }: FeedbackSummaryProps) {
  return (
    <div className={styles.summary}>
      <p className={styles.assessment}>{feedback.overallAssessment}</p>

      <div className={styles.listsRow}>
        <div className={styles.list}>
          <h3 className={`${styles.listTitle} ${styles.listTitleGreen}`}>Strengths</h3>
          <ul className={styles.items}>
            {feedback.strengths.map((s, i) => (
              <li key={i} className={`${styles.item} ${styles.itemGood}`}>
                <span className={styles.dot}>●</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.list}>
          <h3 className={`${styles.listTitle} ${styles.listTitleAmber}`}>Areas to Improve</h3>
          <ul className={styles.items}>
            {feedback.improvementAreas.map((a, i) => (
              <li key={i} className={`${styles.item} ${styles.itemImprovement}`}>
                <span className={styles.dot}>●</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.tips}>
        <h3 className={styles.listTitle}>Coaching Tips</h3>
        <ol className={styles.items}>
          {feedback.coachingTips.map((tip, i) => (
            <li key={i} className={styles.tipItem}>
              {tip}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
