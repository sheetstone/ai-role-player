import { useState, useRef, useCallback, useEffect } from 'react'
import { RECORDING_MAX_SECONDS, RECORDING_SHORT_TAP_MS, LS_RECORD_MODE } from '../constants'

/** How the user triggers recording: hold the button (ptt) or tap once to start and tap again to stop (toggle). */
export type RecordMode = 'ptt' | 'toggle'

interface UseMediaRecorderOptions {
  /** Ref to the live MediaStream from useMicPermission — the recorder reads this when recording starts. */
  streamRef: React.MutableRefObject<MediaStream | null>
  /** Called with the recorded audio Blob when the user finishes speaking. This is what gets sent to STT. */
  onBlob: (blob: Blob) => void
}

export interface UseMediaRecorderReturn {
  /** True while audio is actively being captured. */
  isRecording: boolean
  /** How many seconds have elapsed in the current recording (counts up from 0). */
  recordingSeconds: number
  /** Current recording mode — 'ptt' (push-to-talk) or 'toggle' (tap on/off). Persisted to localStorage. */
  mode: RecordMode
  /** Change the recording mode and save it to localStorage so it survives page refreshes. */
  setMode: (m: RecordMode) => void
  /** Start recording in push-to-talk mode (call on mouse/touch down). */
  pttStart: () => void
  /** Stop recording in push-to-talk mode (call on mouse/touch up). */
  pttEnd: () => void
  /** Toggle recording on or off (for tap mode). */
  toggleRecord: () => void
  /** Discard the current recording without sending it. Called when the user presses Escape. */
  cancel: () => void
  /** Short feedback message to show the user (e.g. "Hold to record" if the tap was too brief). Clears itself after a timeout. */
  toastMessage: string | null
}

/**
 * Manages the MediaRecorder lifecycle — starting, stopping, and timing recordings.
 *
 * Supports two modes that the user can switch between:
 * - **ptt** (push-to-talk): hold the mic button to record, release to send
 * - **toggle**: tap once to start, tap again to stop
 *
 * Enforces a max recording length (30s) and ignores taps shorter than 200ms
 * (accidental touches). The selected mode is saved to localStorage so it
 * persists across page refreshes.
 *
 * This hook does not request mic permission — it expects a stream from
 * `useMicPermission` via `streamRef`.
 *
 * @example
 * const recorder = useMediaRecorder({ streamRef, onBlob: handleBlob })
 * // In PTT mode:
 * <button onMouseDown={recorder.pttStart} onMouseUp={recorder.pttEnd}>Record</button>
 */
export function useMediaRecorder({ streamRef, onBlob }: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [mode, setModeState] = useState<RecordMode>(() => {
    try {
      const saved = localStorage.getItem(LS_RECORD_MODE)
      return saved === 'toggle' ? 'toggle' : 'ptt'
    } catch {
      return 'ptt'
    }
  })

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)
  const mimeTypeRef = useRef<string>('audio/webm')
  const onBlobRef = useRef(onBlob)
  onBlobRef.current = onBlob

  const showToast = useCallback((msg: string, durationMs: number) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), durationMs)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return

    chunksRef.current = []
    cancelledRef.current = false
    startTimeRef.current = Date.now()

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    mimeTypeRef.current = mimeType || 'audio/webm'

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      clearTimer()
      setIsRecording(false)
      setRecordingSeconds(0)

      if (cancelledRef.current) return

      const duration = Date.now() - startTimeRef.current
      if (duration < RECORDING_SHORT_TAP_MS) {
        showToast('Hold to record', 2500)
        return
      }

      onBlobRef.current(new Blob(chunksRef.current, { type: mimeTypeRef.current }))
    }

    recorder.start()
    setIsRecording(true)

    let secs = 0
    timerRef.current = setInterval(() => {
      secs += 1
      setRecordingSeconds(secs)
      if (secs >= RECORDING_MAX_SECONDS) {
        showToast('Max recording length reached', 3000)
        recorder.stop()
      }
    }, 1000)
  }, [clearTimer, showToast, streamRef])

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const pttStart = useCallback(() => {
    if (!isRecording) startRecording()
  }, [isRecording, startRecording])

  const pttEnd = useCallback(() => {
    if (isRecording) stopRecording()
  }, [isRecording, stopRecording])

  const toggleRecord = useCallback(() => {
    if (isRecording) stopRecording()
    else startRecording()
  }, [isRecording, startRecording, stopRecording])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const setMode = useCallback((m: RecordMode) => {
    setModeState(m)
    try { localStorage.setItem(LS_RECORD_MODE, m) } catch {}
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current?.state === 'recording') {
        cancelledRef.current = true
        recorderRef.current.stop()
      }
    }
  }, [clearTimer])

  return { isRecording, recordingSeconds, mode, setMode, pttStart, pttEnd, toggleRecord, cancel, toastMessage }
}
