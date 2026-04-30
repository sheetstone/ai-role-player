import { useState, useEffect } from 'react'
import { useSession } from '../../context/SessionContext'
import styles from './SessionControls.module.css'

interface SessionControlsProps {
  /** Stop recording, stop AI playback, and move the session to 'paused'. */
  onPause: () => void
  /** Move the session back to 'listening'. */
  onResume: () => void
  /** End the session and navigate to the feedback page. */
  onEnd: () => void
  /** Reset and restart the session with the same scenario + persona. */
  onRestart: () => void
}

/**
 * Pause/Resume/Restart/End toolbar shown during an active session.
 *
 * Reads `state` directly from `SessionContext` — no `state` prop needed.
 * Only the four action callbacks need to be passed as props because they
 * contain orchestration logic (stopping audio, resetting context, navigating).
 *
 * "End" and "Restart" require a confirmation click to prevent accidental
 * taps (the confirmation replaces the button with "Yes / No"). Any other
 * button press clears the pending confirmation.
 *
 * The Space bar toggles Pause/Resume when focus is not on a form element.
 * The toolbar is invisible (`null`) when the session is `idle` or `ended`.
 */

export default function SessionControls({
  onPause,
  onResume,
  onEnd,
  onRestart,
}: SessionControlsProps) {
  const { state } = useSession()
  const [confirming, setConfirming] = useState<'end' | 'restart' | null>(null)

  const isActive = state !== 'idle' && state !== 'ended'
  const isPaused = state === 'paused'

  // Space key toggles pause/resume (when focus isn't on a form element)
  useEffect(() => {
    if (!isActive) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return
      e.preventDefault()
      if (confirming) { setConfirming(null); return }
      if (isPaused) onResume()
      else onPause()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isActive, isPaused, confirming, onPause, onResume])

  if (!isActive) return null

  const handleConfirm = (action: 'end' | 'restart') => {
    setConfirming(null)
    if (action === 'end') onEnd()
    else onRestart()
  }

  return (
    <div className={styles.controls} role="toolbar" aria-label="Session controls">
      <button
        className={styles.pauseBtn}
        onClick={() => (isPaused ? onResume() : onPause())}
        title={`${isPaused ? 'Resume' : 'Pause'} (Space)`}
        aria-label={isPaused ? 'Resume session' : 'Pause session'}
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {confirming === 'restart' ? (
        <span className={styles.confirmGroup}>
          <span className={styles.confirmLabel}>Restart?</span>
          <button className={styles.confirmYes} onClick={() => handleConfirm('restart')}>Yes</button>
          <button className={styles.confirmNo} onClick={() => setConfirming(null)}>No</button>
        </span>
      ) : (
        <button
          className={styles.restartBtn}
          onClick={() => setConfirming('restart')}
          disabled={!!confirming}
          aria-label="Restart session"
        >
          ↺ Restart
        </button>
      )}

      {confirming === 'end' ? (
        <span className={styles.confirmGroup}>
          <span className={styles.confirmLabel}>End session?</span>
          <button className={styles.confirmYes} onClick={() => handleConfirm('end')}>Yes</button>
          <button className={styles.confirmNo} onClick={() => setConfirming(null)}>No</button>
        </span>
      ) : (
        <button
          className={styles.endBtn}
          onClick={() => setConfirming('end')}
          disabled={!!confirming}
          aria-label="End session"
        >
          ■ End
        </button>
      )}
    </div>
  )
}
