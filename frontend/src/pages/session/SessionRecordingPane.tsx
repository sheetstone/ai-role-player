import type { RecordMode, PermissionState } from '../../hooks/useVoiceRecorder'
import { useSession } from '../../context/SessionContext'
import VoicePanel from '../../components/session/VoicePanel'
import MicPermissionGuide from '../../components/session/MicPermissionGuide'
import SttFallbackInput from '../../components/session/SttFallbackInput'
import styles from '../SessionPage.module.css'

interface SessionRecordingPaneProps {
  /** Whether the user has granted, denied, or not yet answered the mic permission prompt. */
  permissionState: PermissionState
  /** Re-trigger the mic permission prompt (used as the "Try again" action in MicPermissionGuide). */
  requestPermission: () => Promise<void>
  /** True while the MediaRecorder is actively capturing audio. */
  isRecording: boolean
  /** Seconds elapsed in the current recording. Passed to VoicePanel to drive the timer display. */
  recordingSeconds: number
  /** Current recording mode ('ptt' or 'toggle'). */
  mode: RecordMode
  /** Called when the user switches between Hold and Tap mode. */
  onModeChange: (m: RecordMode) => void
  /** Web Audio AnalyserNode for the live waveform visualization. Null until permission is granted. */
  analyserNode: AnalyserNode | null
  /** Short feedback message to show (e.g. "Hold to record"). Null when nothing to show. */
  toastMessage: string | null
  /** Start recording in push-to-talk mode (mouse/touch down). */
  onPttStart: () => void
  /** Stop recording in push-to-talk mode (mouse/touch up). */
  onPttEnd: () => void
  /** Toggle recording in tap mode. */
  onToggleRecord: () => void
  /** Discard the current recording without submitting it. */
  onCancel: () => void
  /** When true, show the text input fallback below the voice panel. */
  showFallback: boolean
  /** Called when the user submits text via the fallback input. */
  onManualSubmit: (text: string) => void
  /** Called when the user closes the fallback input without submitting. */
  onHideFallback: () => void
}

/**
 * Decides which recording UI to show based on the microphone permission state:
 * - **denied** → `MicPermissionGuide` with step-by-step browser instructions
 * - **granted** → `VoicePanel` (mic button + waveform) + optional `SttFallbackInput`
 * - **requesting / unknown** → a "Requesting microphone access…" status message
 *
 * The `disabled` state (mic button grayed out during processing/paused) is
 * derived from `SessionContext` directly instead of being passed as a prop.
 */

export default function SessionRecordingPane({
  permissionState, requestPermission,
  isRecording, recordingSeconds, mode, onModeChange,
  analyserNode, toastMessage,
  onPttStart, onPttEnd, onToggleRecord, onCancel,
  showFallback, onManualSubmit, onHideFallback,
}: Omit<SessionRecordingPaneProps, 'disabled'>) {
  const { state } = useSession()
  const disabled = state === 'processing' || state === 'ended' || state === 'paused'
  if (permissionState === 'denied') {
    return <MicPermissionGuide onRetry={requestPermission} />
  }

  if (permissionState === 'granted') {
    return (
      <>
        <VoicePanel
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          mode={mode}
          onModeChange={onModeChange}
          analyserNode={analyserNode}
          toastMessage={toastMessage}
          onPttStart={onPttStart}
          onPttEnd={onPttEnd}
          onToggleRecord={onToggleRecord}
          onCancel={onCancel}
          disabled={disabled}
        />
        {showFallback && (
          <SttFallbackInput onSubmit={onManualSubmit} onCancel={onHideFallback} />
        )}
      </>
    )
  }

  return (
    <p className={styles.requesting} role="status" aria-busy="true">
      Requesting microphone access…
    </p>
  )
}
