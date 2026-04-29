import { useCallback, useRef, useState } from 'react'
import { useSession } from '../context/SessionContext'
import { useModelConfig } from './useModelConfig'
import { voiceApi } from '../services/voiceApi'

interface UseAudioPlayerOptions {
  onTtsError?: (message: string) => void
}

export function useAudioPlayer({ onTtsError }: UseAudioPlayerOptions = {}) {
  const { dispatch } = useSession()
  const { ttsModel } = useModelConfig()
  // Ref so the play callback always reads the latest selected model without
  // needing to be recreated when the selection changes.
  const ttsModelRef = useRef(ttsModel)
  ttsModelRef.current = ttsModel

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Use refs for volume/muted so callbacks always see the latest value without
  // being recreated. State is kept in sync for React rendering.
  const volumeRef = useRef(1)
  const isMutedRef = useRef(false)
  const [volume, setVolumeState] = useState(1)
  const [isMuted, setIsMutedState] = useState(false)

  function getOrCreateCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new AudioContext()
      const gain = ctx.createGain()
      gain.gain.value = isMutedRef.current ? 0 : volumeRef.current
      gain.connect(ctx.destination)
      audioCtxRef.current = ctx
      gainNodeRef.current = gain
    }
    return audioCtxRef.current
  }

  // stop() is intentionally synchronous — must respond within 200ms (FP-G04)
  const stop = useCallback(() => {
    abortRef.current?.abort()
    // Don't null abortRef here; play()'s finally block handles that safely
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch (_) {}
      // Null the ref before stop fires onended so the onended guard skips
      // AUDIO_COMPLETE (the caller is responsible for dispatching SKIP_AI).
      sourceRef.current = null
    }
  }, [])

  const play = useCallback(async (text: string, voice?: string) => {
    stop()

    const abortController = new AbortController()
    abortRef.current = abortController

    // 10s TTS timeout (FP-I05)
    const timeoutId = setTimeout(() => abortController.abort(), 10_000)

    try {
      const response = await voiceApi.speak(text, voice, abortController.signal, ttsModelRef.current)
      clearTimeout(timeoutId)

      if (abortController.signal.aborted) return

      if (!response.ok) {
        const msg = 'Audio unavailable for this response'
        onTtsError?.(msg)
        dispatch({ type: 'ERROR', message: msg })
        return
      }

      const arrayBuffer = await response.arrayBuffer()
      if (abortController.signal.aborted) return

      const ctx = getOrCreateCtx()
      await ctx.resume()

      let audioBuffer: AudioBuffer
      try {
        audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      } catch (decodeErr) {
        // FP-I06: decode failure → fall back to text-only, keep session alive
        console.error('Audio decode error:', decodeErr)
        const msg = 'Audio playback failed for this response'
        onTtsError?.(msg)
        dispatch({ type: 'ERROR', message: msg })
        return
      }

      if (abortController.signal.aborted) return

      // Transition to speaking state once we have decoded audio ready
      dispatch({ type: 'FIRST_AUDIO_CHUNK' })

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(gainNodeRef.current!)
      sourceRef.current = source

      source.onended = () => {
        // Only dispatch AUDIO_COMPLETE for natural completion, not interrupted stop().
        // stop() nulls sourceRef.current before triggering onended, so the check fails
        // and we skip dispatching — the caller handles SKIP_AI instead.
        if (sourceRef.current === source) {
          sourceRef.current = null
          dispatch({ type: 'AUDIO_COMPLETE' })
        }
      }

      source.start()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') return
      console.error('TTS playback error:', error)
      const msg = 'Audio unavailable for this response'
      onTtsError?.(msg)
      dispatch({ type: 'ERROR', message: msg })
    } finally {
      // Only clear the ref if no newer call has replaced it
      if (abortRef.current === abortController) {
        abortRef.current = null
      }
    }
  }, [dispatch, stop, onTtsError])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    volumeRef.current = clamped
    setVolumeState(clamped)
    if (gainNodeRef.current && !isMutedRef.current) {
      gainNodeRef.current.gain.value = clamped
    }
  }, [])

  const mute = useCallback(() => {
    isMutedRef.current = true
    setIsMutedState(true)
    if (gainNodeRef.current) gainNodeRef.current.gain.value = 0
  }, [])

  const unmute = useCallback(() => {
    isMutedRef.current = false
    setIsMutedState(false)
    if (gainNodeRef.current) gainNodeRef.current.gain.value = volumeRef.current
  }, [])

  return { play, stop, setVolume, mute, unmute, volume, isMuted }
}
