import type { Session } from '../../types'
import styles from './Dashboard.module.css'

type Difficulty = Session['difficulty']

interface Props {
  /** The currently selected difficulty level. */
  value: Difficulty
  /** Called when the user clicks a different difficulty button. */
  onChange: (d: Difficulty) => void
}

/**
 * Three-button selector for choosing the AI persona's difficulty level:
 * - **Easy** — cooperative, open to persuasion
 * - **Medium** — realistic pushback, some resistance
 * - **Hard** — skeptical, challenges every claim
 *
 * The description for each option appears in the button's `title` tooltip so
 * users can hover to understand the difference before clicking.
 */

const options: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Easy', desc: 'Cooperative, open to persuasion' },
  { value: 'medium', label: 'Medium', desc: 'Realistic pushback, some resistance' },
  { value: 'hard', label: 'Hard', desc: 'Skeptical, challenging every claim' },
]

export default function DifficultySelector({ value, onChange }: Props) {
  return (
    <div className={styles.selectorGroup}>
      <span className={styles.label}>Difficulty</span>
      <div className={styles.difficultyOptions}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.difficultyBtn} ${value === opt.value ? styles.difficultyBtnActive : ''}`}
            onClick={() => onChange(opt.value)}
            title={opt.desc}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
