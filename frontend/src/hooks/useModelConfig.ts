import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ai-role-player:model-config'

// ── Model option lists ────────────────────────────────────────────────────────
// Update the `id` fields if Google releases models under different API names.

export const LLM_OPTIONS = [
  { label: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash' },
  { label: 'Gemini 2.5 Flash Lite', id: 'gemini-2.5-flash-lite' },
  { label: 'Gemini 3 Flash', id: 'gemini-3-flash-preview' },
  { label: 'Gemini 3.1 Flash Lite', id: 'gemini-3.1-flash-lite-preview' },
] as const

export const TTS_OPTIONS = [
  { label: '2.5 Flash TTS', id: 'gemini-2.5-flash-preview-tts' },
  { label: '3.1 Flash TTS', id: 'gemini-3.1-flash-tts-preview' },
] as const

export interface ModelConfig {
  llmModel: string
  ttsModel: string
}

const DEFAULT: ModelConfig = {
  llmModel: LLM_OPTIONS[0].id,
  ttsModel: TTS_OPTIONS[0].id,
}

function load(): ModelConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}

function persist(cfg: ModelConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function useModelConfig() {
  const [config, setConfig] = useState<ModelConfig>(load)

  const setLlmModel = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, llmModel: id }
      persist(next)
      return next
    })
  }, [])

  const setTtsModel = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, ttsModel: id }
      persist(next)
      return next
    })
  }, [])

  return { ...config, setLlmModel, setTtsModel }
}
