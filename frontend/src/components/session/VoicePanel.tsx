import { useEffect, useCallback } from 'react'
import type { RecordMode } from '../../hooks/useVoiceRecorder'
import WaveformCanvas from './WaveformCanvas'
import { formatDuration } from '../../utils'
import styles from './VoicePanel.module.css'

interface VoicePanelProps {
  /** True while audio is being captured. Controls button appearance and cancel button visibility. */
  isRecording: boolean
  /** Elapsed recording seconds. Displayed as a MM:SS timer while recording. */
  recordingSeconds: number
  /** Current recording mode — determines whether pointer events trigger PTT or toggle behavior. */
  mode: RecordMode
  /** Called when the user switches between Hold (ptt) and Tap (toggle) mode. */
  onModeChange: (m: RecordMode) => void
  /** AnalyserNode from Web Audio API — animates the live waveform while recording. */
  analyserNode: AnalyserNode | null
  /** Short message to show in the toast area (e.g. "Hold to record"). Null = no toast. */
  toastMessage: string | null
  /** Mouse/touch down handler for push-to-talk mode. */
  onPttStart: () => void
  /** Mouse/touch up handler for push-to-talk mode. */
  onPttEnd: () => void
  /** Click handler for toggle mode. */
  onToggleRecord: () => void
  /** Discard the current recording. Also triggered by the Escape key. */
  onCancel: () => void
  /** When true, the mic button is disabled (e.g. during AI processing). */
  disabled?: boolean
}

/**
 * The primary recording UI — the mic button, live waveform, recording timer,
 * mode toggle (Hold/Tap), and toast messages.
 *
 * Handles both recording modes internally:
 * - **Hold (ptt)**: `onPointerDown` → `onPttStart`, `onPointerUp` → `onPttEnd`
 * - **Tap (toggle)**: `onClick` → `onToggleRecord`
 *
 * The Escape key cancels an in-progress recording regardless of mode.
 */

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

export default function VoicePanel({
  isRecording,
  recordingSeconds,
  mode,
  onModeChange,
  analyserNode,
  toastMessage,
  onPttStart,
  onPttEnd,
  onToggleRecord,
  onCancel,
  disabled,
}: VoicePanelProps) {
  // Escape key cancels recording (FP-C06)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecording) {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isRecording, onCancel])

  // Only call preventDefault in PTT mode to preserve click for toggle mode
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (mode === 'ptt') {
        e.preventDefault()
        onPttStart()
      }
    },
    [mode, onPttStart]
  )

  const handlePointerUp = useCallback(() => {
    if (mode === 'ptt') onPttEnd()
  }, [mode, onPttEnd])

  const handleClick = useCallback(() => {
    if (mode === 'toggle') onToggleRecord()
  }, [mode, onToggleRecord])

  const btnLabel =
    mode === 'ptt'
      ? isRecording
        ? 'Release to send'
        : 'Hold to record'
      : isRecording
        ? 'Tap to stop'
        : 'Tap to start'

  return (
    <div className={styles.panel}>
      {/* Mode toggle (FP-C03) */}
      <div className={styles.modeToggle} role="group" aria-label="Recording mode">
        <button
          className={`${styles.modeBtn} ${mode === 'ptt' ? styles.modeBtnActive : ''}`}
          onClick={() => onModeChange('ptt')}
          aria-pressed={mode === 'ptt'}
        >
          Hold
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'toggle' ? styles.modeBtnActive : ''}`}
          onClick={() => onModeChange('toggle')}
          aria-pressed={mode === 'toggle'}
        >
          Tap
        </button>
      </div>

      {/* Live waveform (FP-C04) */}
      <WaveformCanvas
        analyserNode={analyserNode}
        isRecording={isRecording}
        className={styles.waveform}
      />

      {/* Recording timer (FP-C05) */}
      {isRecording && (
        <div
          className={styles.timer}
          aria-live="off"
          aria-label={`Recording: ${formatDuration(recordingSeconds)} of 00:30`}
        >
          <span className={styles.timerDot} aria-hidden="true" />
          <span className={styles.timerTime}>{formatDuration(recordingSeconds)}</span>
          <span className={styles.timerMax}> / 00:30</span>
        </div>
      )}

      {/* Mic button + cancel (FP-C02, FP-C06) */}
      <div className={styles.btnRow}>
        <button
          className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          onClick={handleClick}
          disabled={disabled}
          aria-label={btnLabel}
          aria-pressed={isRecording}
        >
          <MicIcon />
        </button>
      </div>

      <p className={styles.hint}>{btnLabel}</p>

      {/* Cancel button — only visible during recording (FP-C06) */}
      {isRecording && (
        <button
          className={styles.cancelBtn}
          onClick={onCancel}
          aria-label="Cancel recording (Escape)"
        >
          Cancel <span className={styles.cancelKbd}>Esc</span>
        </button>
      )}

      {/* Toast notifications (FP-C02, FP-C05) */}
      {toastMessage && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
