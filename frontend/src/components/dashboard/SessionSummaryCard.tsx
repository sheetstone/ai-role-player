import type { Scenario, Persona } from '../../types'
import styles from './Dashboard.module.css'

interface Props {
  /** The chosen scenario. If null, a placeholder prompt is shown. */
  scenario: Scenario | null
  /** The chosen persona. If null, a placeholder prompt is shown. */
  persona: Persona | null
}

/**
 * Preview card shown on the dashboard after a scenario and persona are selected.
 * Displays three sections:
 * 1. **Scenario Goals** — what the learner is trying to achieve
 * 2. **Persona** — the AI character's name, behavior notes, and trait chips
 * 3. **Suggested Skill Focus** — what skill the scenario is designed to practice
 *
 * Uses `aria-live="polite"` so screen readers announce when the selection changes.
 */

export default function SessionSummaryCard({ scenario, persona }: Props) {
  if (!scenario || !persona) {
    return (
      <div className={styles.summaryCard} aria-live="polite">
        <p className={styles.summaryPlaceholder}>
          Select a scenario and persona to see the session summary.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.summaryCard} aria-live="polite">
      <section className={styles.summarySection}>
        <h3 className={styles.summarySectionTitle}>Scenario Goals</h3>
        <ul className={styles.goalsList}>
          {scenario.goals.map((goal, i) => (
            <li key={i} className={styles.goalItem}>
              <span className={styles.goalBullet}>→</span> {goal}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.summarySection}>
        <h3 className={styles.summarySectionTitle}>Persona — {persona.name}</h3>
        <p className={styles.behaviorNotes}>{persona.behaviorNotes}</p>
        <div className={styles.traitChips}>
          {persona.traits.map((t) => (
            <span key={t} className={styles.traitChip}>{t}</span>
          ))}
        </div>
      </section>

      <section className={styles.summarySection}>
        <h3 className={styles.summarySectionTitle}>Suggested Skill Focus</h3>
        <p className={styles.skillFocus}>{scenario.suggestedSkillFocus}</p>
      </section>
    </div>
  )
}
