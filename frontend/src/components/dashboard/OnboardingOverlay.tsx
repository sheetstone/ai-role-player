import styles from './Dashboard.module.css'

interface Props {
  onDismiss: () => void
}

export default function OnboardingOverlay({ onDismiss }: Props) {
  return (
    <div className={styles.overlayBackdrop} role="dialog" aria-modal="true" aria-label="Welcome">
      <div className={styles.overlayCard}>
        <h2 className={styles.overlayTitle}>Before you start</h2>
        <ul className={styles.overlayList}>
          <li>Hold the mic button to record, release to submit (push-to-talk)</li>
          <li>Or tap once to start recording, tap again to stop</li>
          <li>The AI persona may take 1–2 seconds to respond — that&apos;s normal</li>
          <li>You can interrupt the AI at any time by pressing the mic button</li>
          <li>Press &quot;End Session&quot; when you&apos;re done to see your feedback</li>
        </ul>
        <button className={styles.overlayBtn} onClick={onDismiss} autoFocus>
          Got it, let&apos;s go
        </button>
      </div>
    </div>
  )
}
