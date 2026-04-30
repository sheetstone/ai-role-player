import { IconMute, IconVolume, IconSkip } from '../ui/Icon'
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
