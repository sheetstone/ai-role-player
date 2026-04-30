/**
 * The in-session role-play screen. This is a thin routing shell — all the
 * logic lives in `useSessionOrchestrator`. This component is responsible only
 * for reading the orchestrator's return values and passing them to the right
 * child components.
 *
 * Layout (top to bottom):
 * 1. Header — scenario + persona name, nav links
 * 2. SessionStateIndicator — the current state pill (Listening / Processing / Speaking …)
 * 3. SessionControls — Pause / Resume / End / Restart toolbar
 * 4. TranscriptPanel — real-time conversation log
 * 5. SessionPlaybackPane — mute/volume/skip (only visible when AI is speaking)
 * 6. SessionRecordingPane — mic button or MicPermissionGuide
 * 7. ErrorToast — dismissible error notification
 */
import { Link } from 'react-router-dom'
import { useSessionOrchestrator } from './session/useSessionOrchestrator'
import SessionStateIndicator from '../components/session/SessionStateIndicator'
import SessionControls from '../components/session/SessionControls'
import TranscriptPanel from '../components/session/TranscriptPanel'
import ErrorToast from '../components/session/ErrorToast'
import SessionRecordingPane from './session/SessionRecordingPane'
import SessionPlaybackPane from './session/SessionPlaybackPane'
import styles from './SessionPage.module.css'

export default function SessionPage() {
  const {
    session, state,
    permissionState, requestPermission,
    isRecording, recordingSeconds, mode, setMode,
    pttStart, pttEnd, toggleRecord, cancel,
    analyserNode, toastMessage,
    showFallback, handleManualSubmit, hideFallback,
    volume, isMuted, mute, unmute, setVolume, handleSkipAI,
    handlePause, handleResume, handleEnd, handleRestart,
    errorToast, clearErrorToast,
  } = useSessionOrchestrator()

  if (!session) {
    return (
      <main className={styles.page}>
        <p className={styles.noSession}>
          No active session. <Link to="/">Return to dashboard</Link>
        </p>
      </main>
    )
  }

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

      <SessionStateIndicator />

      <SessionControls
        onPause={handlePause}
        onResume={handleResume}
        onEnd={handleEnd}
        onRestart={handleRestart}
      />

      <TranscriptPanel />

      {state === 'speaking' && (
        <SessionPlaybackPane
          volume={volume}
          isMuted={isMuted}
          onMute={mute}
          onUnmute={unmute}
          onVolumeChange={setVolume}
          onSkip={handleSkipAI}
        />
      )}

      <SessionRecordingPane
        permissionState={permissionState}
        requestPermission={requestPermission}
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
        showFallback={showFallback}
        onManualSubmit={handleManualSubmit}
        onHideFallback={hideFallback}
      />

      {errorToast && (
        <ErrorToast
          message={errorToast.message}
          onRetry={errorToast.onRetry}
          onDismiss={clearErrorToast}
        />
      )}
    </main>
  )
}
