import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useEarcons } from '../hooks/useEarcons'
import { useStreamingTranscript } from '../hooks/useStreamingTranscript'
import { voiceApi } from '../services/voiceApi'
import VoicePanel from '../components/session/VoicePanel'
import MicPermissionGuide from '../components/session/MicPermissionGuide'
import SessionStateIndicator from '../components/session/SessionStateIndicator'
import SttFallbackInput from '../components/session/SttFallbackInput'
import styles from './SessionPage.module.css'

export default function SessionPage() {
  const { session, state, dispatch } = useSession()
  const [sttErrorCount, setSttErrorCount] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const { streamTurn } = useStreamingTranscript()

  // FP-D03: earcons on state transitions
  useEarcons(state)

  // Trigger AI response when a new user turn is added
  useEffect(() => {
    if (!session || state !== 'processing') return

    const lastTurn = session.turns[session.turns.length - 1]
    if (lastTurn && lastTurn.speaker === 'user' && !lastTurn.partial) {
      streamTurn(lastTurn.text)
    }
  }, [session?.turns.length, state, session, streamTurn])

  const handleTranscribe = useCallback(async (blob: Blob) => {
    try {
      const { text } = await voiceApi.transcribe(blob)
      if (!text || !text.trim()) {
        throw new Error('Empty transcription')
      }
      
      // Success: Reset error count and add turn
      setSttErrorCount(0)
      dispatch({ 
        type: 'ADD_TURN', 
        turn: {
          id: crypto.randomUUID(),
          speaker: 'user',
          text,
          timestamp: Date.now()
        }
      })
      
      // FP-F will trigger LLM call here when ADD_TURN is processed
    } catch (err) {
      console.error('[SessionPage] Transcribe error:', err)
      const nextCount = sttErrorCount + 1
      setSttErrorCount(nextCount)
      
      if (nextCount >= 2) {
        setShowFallback(true)
      }
      
      dispatch({ type: 'ERROR', message: 'Transcription failed. Please try again or type your message.' })
    }
  }, [sttErrorCount, dispatch])

  const handleManualSubmit = (text: string) => {
    setShowFallback(false)
    setSttErrorCount(0)
    dispatch({ 
      type: 'ADD_TURN', 
      turn: {
        id: crypto.randomUUID(),
        speaker: 'user',
        text,
        timestamp: Date.now()
      }
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
      // Transition to processing immediately (within 300ms — FP-E02)
      dispatch({ type: 'STOP_RECORDING' })
      handleTranscribe(blob)
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
        <>
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
    </main>
  )
}
