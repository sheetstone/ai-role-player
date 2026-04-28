import { useEffect, useCallback } from 'react'
import type { RecordMode } from '../../hooks/useVoiceRecorder'
import WaveformCanvas from './WaveformCanvas'
import styles from './VoicePanel.module.css'

interface VoicePanelProps {
  isRecording: boolean
  recordingSeconds: number
  mode: RecordMode
  onModeChange: (m: RecordMode) => void
  analyserNode: AnalyserNode | null
  toastMessage: string | null
  onPttStart: () => void
  onPttEnd: () => void
  onToggleRecord: () => void
  onCancel: () => void
  disabled?: boolean
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

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
          aria-label={`Recording: ${formatTime(recordingSeconds)} of 00:30`}
        >
          <span className={styles.timerDot} aria-hidden="true" />
          <span className={styles.timerTime}>{formatTime(recordingSeconds)}</span>
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
