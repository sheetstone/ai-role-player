import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useEarcons } from '../hooks/useEarcons'
import VoicePanel from '../components/session/VoicePanel'
import MicPermissionGuide from '../components/session/MicPermissionGuide'
import SessionStateIndicator from '../components/session/SessionStateIndicator'
import styles from './SessionPage.module.css'

export default function SessionPage() {
  const { session, state, dispatch } = useSession()

  // FP-D03: earcons on state transitions (muted flag wired by FP-G02 later)
  useEarcons(state)

  const {
    permissionState,
    requestPermission,
    isRecording,
    recordingSeconds,
    mode,
    setMode,
    pttStart,
    pttEnd,
    toggleRecord,
    cancel,
    analyserNode,
    toastMessage,
  } = useVoiceRecorder({
    onBlob: (blob) => {
      // Transition to processing immediately (within 300ms — FP-E02)
      dispatch({ type: 'STOP_RECORDING' })
      // FP-E02 will wire this blob to the STT → LLM → TTS pipeline
      console.log('[SessionPage] audio blob ready:', blob.size, 'bytes, type:', blob.type)
    },
  })

  // FP-C01: request mic permission on session page mount
  useEffect(() => {
    if (permissionState === 'unknown') {
      requestPermission()
    }
  }, [permissionState, requestPermission])

  if (!session) {
    return (
      <main className={styles.page}>
        <p className={styles.noSession}>
          No active session.{' '}
          <Link to="/">Return to dashboard</Link>
        </p>
      </main>
    )
  }

  const voiceDisabled =
    state === 'processing' || state === 'speaking' || state === 'ended'

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.sessionMeta}>
          <span className={styles.scenarioLabel}>{session.scenario.name}</span>
          <span className={styles.separator}>·</span>
          <span className={styles.personaLabel}>{session.persona.name}</span>
        </div>
        <nav className={styles.nav}>
          <Link to="/">← Dashboard</Link>
          <Link to="/feedback">→ Feedback</Link>
        </nav>
      </header>

      {/* FP-D02: always-visible state indicator */}
      <SessionStateIndicator />

      {permissionState === 'denied' ? (
        <MicPermissionGuide onRetry={requestPermission} />
      ) : permissionState === 'granted' ? (
        <VoicePanel
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          mode={mode}
          onModeChange={setMode}
          analyserNode={analyserNode}
          toastMessage={toastMessage}
          onPttStart={pttStart}
          onPttEnd={pttEnd}
          onToggleRecord={toggleRecord}
          onCancel={cancel}
          disabled={voiceDisabled}
        />
      ) : (
        <p className={styles.requesting} role="status" aria-busy="true">
          Requesting microphone access…
        </p>
      )}
    </main>
  )
}
