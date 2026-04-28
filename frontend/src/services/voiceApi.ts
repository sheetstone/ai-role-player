import { ApiRequestError } from './api'
import type { TranscribeResponse, ChatTurnRequest, FeedbackRequest, FeedbackResult } from '../types'

export const voiceApi = {
  transcribe: async (blob: Blob): Promise<TranscribeResponse> => {
    const form = new FormData()
    form.append('audio', blob, 'recording.webm')

    const res = await fetch('/api/audio/transcribe', { method: 'POST', body: form })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiRequestError(res.status, body.error ?? res.statusText)
    }
    return res.json() as Promise<TranscribeResponse>
  },

  // Returns an EventSource-compatible URL; caller opens the SSE connection
  chatTurnUrl: () => '/api/chat/turn',

  // Called by useStreamingTranscript to POST and receive SSE
  openChatTurn: (payload: ChatTurnRequest, signal: AbortSignal): Promise<Response> =>
    fetch('/api/chat/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    }),

  // Returns a fetch Response with a binary audio stream
  speak: (text: string, voice?: string): Promise<Response> =>
    fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    }),

  generateFeedback: async (payload: FeedbackRequest): Promise<FeedbackResult> => {
    const res = await fetch('/api/feedback/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiRequestError(res.status, body.error ?? res.statusText)
    }
    return res.json() as Promise<FeedbackResult>
  },
}
