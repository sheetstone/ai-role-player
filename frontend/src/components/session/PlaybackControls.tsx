import styles from './PlaybackControls.module.css'

interface PlaybackControlsProps {
  /** Volume level from 0 (silent) to 1 (full). Displayed as a 0–100 percentage. */
  volume: number
  /** When true, the mute icon is shown and the volume slider is disabled. */
  isMuted: boolean
  /** Silence the AI voice without stopping the audio stream. */
  onMute: () => void
  /** Restore audio to the previous volume level. */
  onUnmute: () => void
  /** Set volume directly (0–1). Called as the user drags the slider. */
  onVolumeChange: (v: number) => void
  /** Cut the current AI response short and return to the listening state. */
  onSkip: () => void
}

/**
 * Toolbar for controlling AI voice playback — mute toggle, volume slider, and
 * a skip button. Shown only while the session state is `'speaking'`.
 *
 * The volume slider is disabled when muted to prevent confusing state where the
 * slider shows a value but nothing is audible.
 */

function IconMute() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function IconVolume() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function IconSkip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}

export default function PlaybackControls({
  volume,
  isMuted,
  onMute,
  onUnmute,
  onVolumeChange,
  onSkip,
}: PlaybackControlsProps) {
  return (
    <div className={styles.controls} role="toolbar" aria-label="AI playback controls">
      <button
        className={styles.iconBtn}
        onClick={isMuted ? onUnmute : onMute}
        aria-label={isMuted ? 'Unmute AI' : 'Mute AI'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <IconMute /> : <IconVolume />}
      </button>

      <input
        type="range"
        className={styles.volumeSlider}
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
        aria-label={`Volume: ${Math.round(volume * 100)}%`}
        disabled={isMuted}
      />

      <span className={styles.volumeLabel} aria-hidden="true">
        {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
      </span>

      <button
        className={`${styles.iconBtn} ${styles.skipBtn}`}
        onClick={onSkip}
        aria-label="Skip AI response and return to listening"
        title="Skip"
      >
        <IconSkip />
        <span className={styles.skipLabel}>Skip</span>
      </button>
    </div>
  )
}
