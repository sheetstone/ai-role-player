import { useMicPermission } from './useMicPermission'
import { useMediaRecorder } from './useMediaRecorder'

export type { RecordMode } from './useMediaRecorder'
export type { PermissionState } from './useMicPermission'

interface UseVoiceRecorderOptions {
  /** Called with the recorded audio Blob after the user finishes speaking. Pass this to the STT service. */
  onBlob: (blob: Blob) => void
}

/**
 * The main recording hook used by the session UI. Composes `useMicPermission`
 * (browser permission + Web Audio setup) and `useMediaRecorder` (recording
 * lifecycle) into a single, flat API that VoicePanel and SessionRecordingPane
 * need.
 *
 * If you need to add recording features, edit `useMediaRecorder`. If you need
 * to change how the mic stream is set up, edit `useMicPermission`. This file
 * should stay as a thin composer.
 *
 * @example
 * const { permissionState, isRecording, pttStart, pttEnd, analyserNode } = useVoiceRecorder({
 *   onBlob: (blob) => sendToStt(blob),
 * })
 */
export function useVoiceRecorder({ onBlob }: UseVoiceRecorderOptions) {
  const { permissionState, requestPermission, analyserNode, streamRef } = useMicPermission()
  const recorder = useMediaRecorder({ streamRef, onBlob })
  return { permissionState, requestPermission, analyserNode, ...recorder }
}
