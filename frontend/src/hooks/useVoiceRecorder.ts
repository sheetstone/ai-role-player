import { useState, useRef, useCallback, useEffect } from 'react'

export type RecordMode = 'ptt' | 'toggle'
export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied'

interface UseVoiceRecorderOptions {
  onBlob: (blob: Blob) => void
}

export interface UseVoiceRecorderReturn {
  permissionState: PermissionState
  requestPermission: () => Promise<void>
  isRecording: boolean
  recordingSeconds: number
  mode: RecordMode
  setMode: (m: RecordMode) => void
  pttStart: () => void
  pttEnd: () => void
  toggleRecord: () => void
  cancel: () => void
  analyserNode: AnalyserNode | null
  toastMessage: string | null
}

const MAX_DURATION_S = 30
const SHORT_TAP_MS = 200
const MODE_KEY = 'ai-role-player:record-mode'

export function useVoiceRecorder({ onBlob }: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [mode, setModeState] = useState<RecordMode>(() => {
    const saved = localStorage.getItem(MODE_KEY)
    return saved === 'toggle' ? 'toggle' : 'ptt'
  })

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
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

  const requestPermission = useCallback(async () => {
    // Clean up any existing resources before re-requesting
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close()
    }
    setAnalyserNode(null)

    setPermissionState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      setAnalyserNode(analyser)

      setPermissionState('granted')
    } catch {
      setPermissionState('denied')
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

    const recorderOptions = mimeType ? { mimeType } : {}
    const recorder = new MediaRecorder(stream, recorderOptions)
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
      if (duration < SHORT_TAP_MS) {
        showToast('Hold to record', 2500)
        return
      }

      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
      onBlobRef.current(blob)
    }

    recorder.start()
    setIsRecording(true)

    let secs = 0
    timerRef.current = setInterval(() => {
      secs += 1
      setRecordingSeconds(secs)
      if (secs >= MAX_DURATION_S) {
        showToast('Max recording length reached', 3000)
        recorder.stop()
      }
    }, 1000)
  }, [clearTimer, showToast])

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
    localStorage.setItem(MODE_KEY, m)
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current?.state === 'recording') {
        cancelledRef.current = true
        recorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close()
      }
    }
  }, [clearTimer])

  return {
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
  }
}
