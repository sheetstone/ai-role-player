import { useState, useRef, useCallback, useEffect } from 'react'

/** Current state of the browser microphone permission request. */
export type PermissionState = 'unknown' | 'requesting' | 'granted' | 'denied'

export interface UseMicPermissionReturn {
  /** Whether the browser has granted, denied, or not yet asked for mic access. */
  permissionState: PermissionState
  /** Call this to show the browser's "allow microphone" prompt. Safe to call more than once. */
  requestPermission: () => Promise<void>
  /** Web Audio AnalyserNode connected to the mic stream — pass this to WaveformCanvas. Null until permission is granted. */
  analyserNode: AnalyserNode | null
  /** The raw MediaStream ref — passed down to useMediaRecorder so it can create a MediaRecorder on demand. */
  streamRef: React.MutableRefObject<MediaStream | null>
}

/**
 * Handles everything related to microphone permission and the Web Audio setup
 * needed for the live waveform display.
 *
 * Call `requestPermission()` to prompt the user. Watch `permissionState` to
 * decide which UI to show: `'requesting'` while the prompt is open, `'granted'`
 * once the user approves, `'denied'` if they block it.
 *
 * Automatically stops the mic stream and closes the AudioContext when the
 * component that uses this hook unmounts.
 *
 * @example
 * const { permissionState, requestPermission, analyserNode, streamRef } = useMicPermission()
 * if (permissionState === 'denied') return <MicPermissionGuide onRetry={requestPermission} />
 * if (permissionState === 'granted') return <WaveformCanvas analyserNode={analyserNode} />
 */
export function useMicPermission(): UseMicPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown')
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const requestPermission = useCallback(async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close()
    }
    setAnalyserNode(null)
    setPermissionState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close()
      }
    }
  }, [])

  return { permissionState, requestPermission, analyserNode, streamRef }
}
