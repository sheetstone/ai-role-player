import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession, SESSION_ACTIONS } from '../../context/SessionContext'
import { useModelConfig } from '../../hooks/useModelConfig'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import { useEarcons } from '../../hooks/useEarcons'
import { useStreamingTranscript } from '../../hooks/useStreamingTranscript'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { voiceApi } from '../../services/voiceApi'
import { STT_FAILURES_BEFORE_FALLBACK } from '../../constants'
import { generateId } from '../../utils'

interface ErrorToastState {
  /** Human-readable description of what went wrong. */
  message: string
  /** If there's a sensible retry action, this will be set so the toast can show a "Try again" button. */
  onRetry?: () => void
}

/**
 * The brain of the session page. Wires together all the session hooks and
 * exposes a flat, prop-ready API that `SessionPage` passes down to its child
 * components.
 *
 * Responsibilities:
 * - Connects `useVoiceRecorder` → STT → `useStreamingTranscript` → `useAudioPlayer`
 *   so voice input drives the full turn pipeline automatically
 * - Shows the text fallback input after `STT_FAILURES_BEFORE_FALLBACK` consecutive failures
 * - Interrupts AI playback when the user presses the mic button while the AI is speaking
 * - Handles Pause / Resume / End / Restart with appropriate cleanup
 * - Converts context errors into dismissible error toasts with optional retry
 *
 * `SessionPage` itself does nothing but call this hook and pass results to
 * child components — all the logic lives here.
 *
 * @example
 * // In SessionPage.tsx:
 * const { session, state, pttStart, pttEnd, handleEnd, errorToast } = useSessionOrchestrator()
 */
export function useSessionOrchestrator() {
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

  const runTurnRef = useRef<(userText: string) => Promise<void>>(async () => {})
  runTurnRef.current = async (userText: string) => {
    if (!session) return
    const fullText = await streamTurn(userText)
    if (fullText) await play(fullText, session.persona.voice)
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

  // Bubble context errors into the unified error toast
  useEffect(() => {
    if (!error) return
    const lastUserTurn = session?.turns.slice().reverse().find((t) => t.speaker === 'user')
    setErrorToast({
      message: error,
      onRetry: lastUserTurn ? () => dispatch({ type: SESSION_ACTIONS.STOP_RECORDING }) : undefined,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  // ── Recording ─────────────────────────────────────────────────────────────

  const handleTranscribe = useCallback(async (blob: Blob) => {
    try {
      const { text } = await voiceApi.transcribe(blob, llmModelRef.current)
      if (!text?.trim()) throw new Error('Empty transcription')
      setSttErrorCount(0)
      dispatch({
        type: SESSION_ACTIONS.ADD_TURN,
        turn: { id: generateId(), speaker: 'user', text, timestamp: Date.now(), partial: false },
      })
    } catch (err) {
      console.error('[session] Transcribe error:', err)
      const nextCount = sttErrorCount + 1
      setSttErrorCount(nextCount)
      if (nextCount >= STT_FAILURES_BEFORE_FALLBACK) setShowFallback(true)
      dispatch({ type: SESSION_ACTIONS.ERROR, message: 'Transcription failed. Please try again or type your message.' })
    }
  }, [sttErrorCount, dispatch])

  const handleManualSubmit = useCallback((text: string) => {
    setShowFallback(false)
    setSttErrorCount(0)
    dispatch({ type: SESSION_ACTIONS.STOP_RECORDING })
    dispatch({
      type: SESSION_ACTIONS.ADD_TURN,
      turn: { id: generateId(), speaker: 'user', text, timestamp: Date.now(), partial: false },
    })
  }, [dispatch])

  const {
    permissionState, requestPermission,
    isRecording, recordingSeconds,
    mode, setMode,
    pttStart, pttEnd, toggleRecord, cancel,
    analyserNode, toastMessage,
  } = useVoiceRecorder({
    onBlob: (blob) => {
      dispatch({ type: SESSION_ACTIONS.STOP_RECORDING })
      handleTranscribe(blob)
    },
  })

  // ── Session controls ──────────────────────────────────────────────────────

  const handlePause = useCallback(() => {
    cancel(); stop(); dispatch({ type: SESSION_ACTIONS.PAUSE_SESSION })
  }, [cancel, stop, dispatch])

  const handleResume = useCallback(() => {
    dispatch({ type: SESSION_ACTIONS.RESUME_SESSION })
  }, [dispatch])

  const handleEnd = useCallback(() => {
    stop(); cancel(); dispatch({ type: SESSION_ACTIONS.END_SESSION }); navigate('/feedback')
  }, [stop, cancel, dispatch, navigate])

  const handleRestart = useCallback(() => {
    if (!session) return
    stop(); cancel()
    const { scenario, persona, difficulty } = session
    dispatch({ type: SESSION_ACTIONS.RESET })
    dispatch({ type: SESSION_ACTIONS.START_SESSION, scenario, persona, difficulty })
  }, [session, stop, cancel, dispatch])

  // ── Interruption handlers ─────────────────────────────────────────────────

  const handlePttStart = useCallback(() => {
    if (state === 'speaking') { stop(); dispatch({ type: SESSION_ACTIONS.SKIP_AI }) }
    pttStart()
  }, [state, stop, dispatch, pttStart])

  const handleToggleRecord = useCallback(() => {
    if (state === 'speaking') { stop(); dispatch({ type: SESSION_ACTIONS.SKIP_AI }); return }
    toggleRecord()
  }, [state, stop, dispatch, toggleRecord])

  const handleSkipAI = useCallback(() => {
    stop(); dispatch({ type: SESSION_ACTIONS.SKIP_AI })
  }, [stop, dispatch])

  // Auto-request permission on mount
  useEffect(() => {
    if (permissionState === 'unknown') requestPermission()
  }, [permissionState, requestPermission])

  return {
    session, state,
    // Recording
    permissionState, requestPermission,
    isRecording, recordingSeconds,
    mode, setMode,
    pttStart: handlePttStart, pttEnd, toggleRecord: handleToggleRecord,
    cancel, analyserNode, toastMessage,
    // Fallback
    showFallback, handleManualSubmit,
    hideFallback: () => setShowFallback(false),
    // Playback
    volume, isMuted, mute, unmute, setVolume, handleSkipAI,
    // Session controls
    handlePause, handleResume, handleEnd, handleRestart,
    // Error toast
    errorToast, clearErrorToast: () => setErrorToast(null),
  }
}
