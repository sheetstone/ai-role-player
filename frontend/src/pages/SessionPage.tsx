import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useModelConfig } from '../hooks/useModelConfig'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useEarcons } from '../hooks/useEarcons'
import { useStreamingTranscript } from '../hooks/useStreamingTranscript'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { voiceApi } from '../services/voiceApi'
import VoicePanel from '../components/session/VoicePanel'
import MicPermissionGuide from '../components/session/MicPermissionGuide'
import SessionStateIndicator from '../components/session/SessionStateIndicator'
import PlaybackControls from '../components/session/PlaybackControls'
import TranscriptPanel from '../components/session/TranscriptPanel'
import SttFallbackInput from '../components/session/SttFallbackInput'
import SessionControls from '../components/session/SessionControls'
import ErrorToast from '../components/session/ErrorToast'
import styles from './SessionPage.module.css'

interface ErrorToastState {
  message: string
  onRetry?: () => void
}

export default function SessionPage() {
  const navigate = useNavigate()
  const { session, state, error, dispatch } = useSession()
  const [sttErrorCount, setSttErrorCount] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const [errorToast, setErrorToast] = useState<ErrorToastState | null>(null)

  const { llmModel } = useModelConfig()
  const llmModelRef = useRef(llmModel)
  llmModelRef.current = llmModel

  const { streamTurn } = useStreamingTranscript()
  const { play, stop, setVolume, mute, unmute, volume, isMuted } = useAudioPlayer({
    onTtsError: (msg) => setErrorToast({ message: msg }),
  })

  useEarcons(state, isMuted)

  // Stable ref so the AI-turn effect always calls the latest closures
  const runTurnRef = useRef<(userText: string) => Promise<void>>(async () => {})
  runTurnRef.current = async (userText: string) => {
    if (!session) return
    const fullText = await streamTurn(userText)
    if (fullText) {
      await play(fullText, session.persona.voice)
    }
  }

  // Trigger AI turn whenever a completed user turn lands in processing state
  useEffect(() => {
    if (!session || state !== 'processing') return
    const lastTurn = session.turns[session.turns.length - 1]
    if (lastTurn && lastTurn.speaker === 'user' && !lastTurn.partial) {
      runTurnRef.current(lastTurn.text)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.turns.length, state])

  // Bubble context errors (STT/LLM) into the unified error toast.
  // Retry re-triggers the AI turn by advancing state back to processing.
  useEffect(() => {
    if (!error) return
    const lastUserTurn = session?.turns.slice().reverse().find((t) => t.speaker === 'user')
    setErrorToast({
      message: error,
      onRetry: lastUserTurn
        ? () => dispatch({ type: 'STOP_RECORDING' })
        : undefined,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  // ── Voice recording ──────────────────────────────────────────────────────

  const handleTranscribe = useCallback(async (blob: Blob) => {
    try {
      const { text } = await voiceApi.transcribe(blob, llmModelRef.current)
      if (!text?.trim()) throw new Error('Empty transcription')

      setSttErrorCount(0)
      dispatch({
        type: 'ADD_TURN',
        turn: {
          id: crypto.randomUUID(),
          speaker: 'user',
          text,
          timestamp: Date.now(),
          partial: false,
        },
      })
    } catch (err) {
      console.error('[SessionPage] Transcribe error:', err)
      const nextCount = sttErrorCount + 1
      setSttErrorCount(nextCount)
      if (nextCount >= 2) setShowFallback(true)
      dispatch({ type: 'ERROR', message: 'Transcription failed. Please try again or type your message.' })
    }
  }, [sttErrorCount, dispatch])

  const handleManualSubmit = (text: string) => {
    setShowFallback(false)
    setSttErrorCount(0)
    dispatch({ type: 'STOP_RECORDING' })
    dispatch({
      type: 'ADD_TURN',
      turn: {
        id: crypto.randomUUID(),
        speaker: 'user',
        text,
        timestamp: Date.now(),
        partial: false,
      },
    })
  }

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
      dispatch({ type: 'STOP_RECORDING' })
      handleTranscribe(blob)
    },
  })

  // ── Session control handlers ─────────────────────────────────────────────

  const handlePause = useCallback(() => {
    cancel()
    stop()
    dispatch({ type: 'PAUSE_SESSION' })
  }, [cancel, stop, dispatch])

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME_SESSION' })
  }, [dispatch])

  const handleEnd = useCallback(() => {
    stop()
    cancel()
    dispatch({ type: 'END_SESSION' })
    navigate('/feedback')
  }, [stop, cancel, dispatch, navigate])

  const handleRestart = useCallback(() => {
    if (!session) return
    stop()
    cancel()
    const { scenario, persona, difficulty } = session
    dispatch({ type: 'RESET' })
    dispatch({ type: 'START_SESSION', scenario, persona, difficulty })
  }, [session, stop, cancel, dispatch])

  // ── Interruption handlers ────────────────────────────────────────────────

  const handlePttStart = useCallback(() => {
    if (state === 'speaking') {
      stop()
      dispatch({ type: 'SKIP_AI' })
    }
    pttStart()
  }, [state, stop, dispatch, pttStart])

  const handleToggleRecord = useCallback(() => {
    if (state === 'speaking') {
      stop()
      dispatch({ type: 'SKIP_AI' })
      return
    }
    toggleRecord()
  }, [state, stop, dispatch, toggleRecord])

  useEffect(() => {
    if (permissionState === 'unknown') requestPermission()
  }, [permissionState, requestPermission])

  if (!session) {
    return (
      <main className={styles.page}>
        <p className={styles.noSession}>
          No active session. <Link to="/">Return to dashboard</Link>
        </p>
      </main>
    )
  }

  const activeTurnId = state === 'speaking'
    ? session.turns.slice().reverse().find((t) => t.speaker === 'persona' && !t.partial)?.id ?? null
    : null

  // Voice panel is active during speaking so the user can interrupt.
  // Disabled while processing (waiting for AI), ended, or paused.
  const voiceDisabled = state === 'processing' || state === 'ended' || state === 'paused'

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
        state={state}
        onPause={handlePause}
        onResume={handleResume}
        onEnd={handleEnd}
        onRestart={handleRestart}
      />

      <TranscriptPanel
        turns={session.turns}
        sessionStartedAt={session.startedAt}
        activeTurnId={activeTurnId}
      />

      {state === 'speaking' && (
        <PlaybackControls
          volume={volume}
          isMuted={isMuted}
          onMute={mute}
          onUnmute={unmute}
          onVolumeChange={setVolume}
          onSkip={() => {
            stop()
            dispatch({ type: 'SKIP_AI' })
          }}
        />
      )}

      {permissionState === 'denied' ? (
        <MicPermissionGuide onRetry={requestPermission} />
      ) : permissionState === 'granted' ? (
        <>
          <VoicePanel
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            mode={mode}
            onModeChange={setMode}
            analyserNode={analyserNode}
            toastMessage={toastMessage}
            onPttStart={handlePttStart}
            onPttEnd={pttEnd}
            onToggleRecord={handleToggleRecord}
            onCancel={cancel}
            disabled={voiceDisabled}
          />
          {showFallback && (
            <SttFallbackInput
              onSubmit={handleManualSubmit}
              onCancel={() => setShowFallback(false)}
            />
          )}
        </>
      ) : (
        <p className={styles.requesting} role="status" aria-busy="true">
          Requesting microphone access…
        </p>
      )}

      {errorToast && (
        <ErrorToast
          message={errorToast.message}
          onRetry={errorToast.onRetry}
          onDismiss={() => setErrorToast(null)}
        />
      )}
    </main>
  )
}
