import { useState, useCallback } from 'react'
import { LS_MODEL_CONFIG, LLM_OPTIONS, TTS_OPTIONS } from '../constants'

export { LLM_OPTIONS, TTS_OPTIONS }

/** The currently selected LLM and TTS model IDs. */
export interface ModelConfig {
  /** The Gemini model ID used for the LLM chat (e.g. 'gemini-2.5-flash'). */
  llmModel: string
  /** The Gemini model ID used for text-to-speech (e.g. 'gemini-2.5-flash-preview-tts'). */
  ttsModel: string
}

const DEFAULT: ModelConfig = {
  llmModel: LLM_OPTIONS[0].id,
  ttsModel: TTS_OPTIONS[0].id,
}

function load(): ModelConfig {
  try {
    const raw = localStorage.getItem(LS_MODEL_CONFIG)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}

function persist(cfg: ModelConfig) {
  try { localStorage.setItem(LS_MODEL_CONFIG, JSON.stringify(cfg)) } catch {}
}

/**
 * Reads and saves the user's preferred LLM and TTS model choices.
 *
 * Selections are persisted to localStorage so they survive page refreshes.
 * The `ModelSelector` component in the dashboard header uses this hook to
 * let the user switch models without reloading the app.
 *
 * @example
 * const { llmModel, ttsModel, setLlmModel, setTtsModel } = useModelConfig()
 * // Show current selection and let the user change it:
 * <select value={llmModel} onChange={e => setLlmModel(e.target.value)}>
 *   {LLM_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
 * </select>
 */
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
