import { useEffect, useRef, useCallback } from 'react'
import type { SessionState } from '../types'

// Earcon spec — only the 4 transitions called out in FP-D03
type Transition =
  | 'idle→listening'
  | 'listening→processing'
  | 'processing→speaking'
  | 'speaking→listening'

interface EarconDef {
  startFreq: number
  endFreq: number
  durationMs: number
  type: OscillatorType
  gain: number
}

const EARCONS: Partial<Record<Transition, EarconDef>> = {
  'idle→listening': {
    startFreq: 350,
    endFreq: 700,
    durationMs: 300,
    type: 'sine',
    gain: 0.12,
  },
  'listening→processing': {
    startFreq: 1000,
    endFreq: 1000,
    durationMs: 50,
    type: 'triangle',
    gain: 0.10,
  },
  'processing→speaking': {
    startFreq: 600,
    endFreq: 1200,
    durationMs: 200,
    type: 'sine',
    gain: 0.12,
  },
  'speaking→listening': {
    startFreq: 700,
    endFreq: 350,
    durationMs: 300,
    type: 'sine',
    gain: 0.10,
  },
}

function playEarcon(audioCtx: AudioContext, def: EarconDef) {
  const osc = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  osc.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  osc.type = def.type
  const now = audioCtx.currentTime
  const dur = def.durationMs / 1000

  osc.frequency.setValueAtTime(def.startFreq, now)
  if (def.endFreq !== def.startFreq) {
    osc.frequency.linearRampToValueAtTime(def.endFreq, now + dur)
  }

  // Envelope: fast attack, hold, fast release
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(def.gain, now + Math.min(0.015, dur * 0.2))
  gainNode.gain.setValueAtTime(def.gain, now + dur - Math.min(0.04, dur * 0.3))
  gainNode.gain.linearRampToValueAtTime(0, now + dur)

  osc.start(now)
  osc.stop(now + dur)
}

export function useEarcons(state: SessionState, muted = false) {
  const prevStateRef = useRef<SessionState | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = state

    // Skip on initial mount (no transition yet) or when muted
    if (prev === null || muted) return

    const key = `${prev}→${state}` as Transition
    const def = EARCONS[key]
    if (!def) return

    const audioCtx = getAudioCtx()
    // AudioContext may be suspended until user interaction; resume silently
    const play = () => playEarcon(audioCtx, def)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(play).catch(() => {})
    } else {
      play()
    }
  }, [state, muted, getAudioCtx])
}
