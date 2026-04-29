import { useCallback, useRef } from 'react'
import { useSession } from '../context/SessionContext'
import { useModelConfig } from './useModelConfig'
import { voiceApi } from '../services/voiceApi'

export function useStreamingTranscript() {
  const { session, dispatch } = useSession()
  const abortControllerRef = useRef<AbortController | null>(null)
  const { llmModel } = useModelConfig()
  const llmModelRef = useRef(llmModel)
  llmModelRef.current = llmModel

  // Returns fullText on success, null on abort/error (caller triggers TTS with the text)
  const streamTurn = useCallback(async (userText: string): Promise<string | null> => {
    if (!session) return null

    // Cancel any in-flight stream before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // 8s timeout for first LLM token (FP-I05)
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 8_000)

    const personaTurnId = crypto.randomUUID()

    try {
      dispatch({
        type: 'ADD_TURN',
        turn: {
          id: personaTurnId,
          speaker: 'persona',
          text: '',
          timestamp: Date.now(),
          partial: true,
        },
      })

      const payload = {
        personaId: session.persona.id,
        scenarioId: session.scenario.id,
        difficulty: session.difficulty,
        history: session.turns,
        userText,
        llmModel: llmModelRef.current,
      }

      const response = await voiceApi.openChatTurn(payload, abortController.signal)
      clearTimeout(timeoutId)

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      // { stream: true } keeps the decoder's internal buffer across calls so
      // multi-byte UTF-8 characters split across network reads aren't corrupted.
      const decoder = new TextDecoder('utf-8', { fatal: false })
      let fullText = ''
      // lineBuffer accumulates raw bytes until we have a complete SSE event
      // (\n\n boundary). This prevents JSON parse failures when TCP delivers
      // the payload of a `data:` line split across multiple reads.
      let lineBuffer = ''

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return 'continue' as const
        const data = JSON.parse(line.slice(6)) as
          | { type: 'delta'; text: string }
          | { type: 'done'; fullText: string }
          | { type: 'error'; message: string }

        if (data.type === 'delta') {
          fullText += data.text
          dispatch({ type: 'UPDATE_TURN', id: personaTurnId, text: fullText, partial: true })
        } else if (data.type === 'done') {
          console.log('[SSE done] fullText:', JSON.stringify(data.fullText))
          // FP-F03: empty response guard
          if (!data.fullText.trim()) {
            dispatch({ type: 'UPDATE_TURN', id: personaTurnId, text: '[No response]', partial: false })
            dispatch({ type: 'ERROR', message: 'Empty response received' })
            return 'empty' as const
          }
          dispatch({ type: 'UPDATE_TURN', id: personaTurnId, text: data.fullText, partial: false })
          return data.fullText
        } else if (data.type === 'error') {
          throw new Error(data.message)
        }
        return 'continue' as const
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value, { stream: true })

        // SSE events are separated by \n\n. Split on that boundary so we only
        // attempt to parse complete events — never a fragment.
        const events = lineBuffer.split('\n\n')
        // Last element may be an incomplete event; keep it in the buffer.
        lineBuffer = events.pop() ?? ''

        for (const event of events) {
          for (const line of event.split('\n')) {
            try {
              const result = processLine(line)
              if (result === 'empty') return null
              if (result !== 'continue') return result  // fullText string from done event
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e
              console.warn('[SSE] parse error on line:', line)
            }
          }
        }
      }

      // Stream ended without a 'done' event — return what was accumulated from deltas
      return fullText || null
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        dispatch({ type: 'ERROR', message: 'AI response timed out. Please try again.' })
        return null
      }
      console.error('Streaming error:', error)
      dispatch({ type: 'ERROR', message: error.message || 'AI response failed' })
      return null
    } finally {
      abortControllerRef.current = null
    }
  }, [session, dispatch])

  return { streamTurn }
}
