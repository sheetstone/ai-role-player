import { useCallback, useRef } from 'react'
import { useSession } from '../context/SessionContext'
import { voiceApi } from '../services/voiceApi'

export function useStreamingTranscript() {
  const { session, dispatch } = useSession()
  const abortControllerRef = useRef<AbortController | null>(null)

  const streamTurn = useCallback(async (userText: string) => {
    if (!session) return

    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const personaTurnId = crypto.randomUUID()

    try {
      // Add a placeholder turn for the persona
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
      }

      const response = await voiceApi.openChatTurn(payload, abortController.signal)
      
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'delta') {
                fullText += data.text
                dispatch({
                  type: 'UPDATE_TURN',
                  id: personaTurnId,
                  text: fullText,
                  partial: true,
                })
              } else if (data.type === 'done') {
                dispatch({
                  type: 'UPDATE_TURN',
                  id: personaTurnId,
                  text: data.fullText,
                  partial: false,
                })
                // FP-G will trigger TTS here
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return
      console.error('Streaming error:', error)
      dispatch({ type: 'ERROR', message: error.message || 'AI response failed' })
    } finally {
      abortControllerRef.current = null
    }
  }, [session, dispatch])

  return { streamTurn }
}
