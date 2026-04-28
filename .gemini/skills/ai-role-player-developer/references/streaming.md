# Streaming & Pipeline Implementation

## Voice Pipeline Order
`[Mic] -> [STT Service] -> [LLM Persona Agent] -> [TTS Service] -> [Audio Playback]`

## STT (Speech-to-Text)
- Forward audio blobs to OpenAI Whisper (`whisper-1`).
- Handle multi-part/form-data on backend.

## LLM Streaming (SSE)
- Use Server-Sent Events (SSE) for token-by-token streaming.
- Backend: `res.setHeader('Content-Type', 'text/event-stream')`.
- Frontend: `EventSource` or `fetch` with `ReadableStream` to update transcript in real-time.

## TTS (Text-to-Speech)
- Use chunked binary streaming.
- Start TTS for the first 1-2 sentences as soon as LLM emits them.
- Frontend: Decode audio chunks using `AudioContext.decodeAudioData` and schedule them for gapless playback using `AudioBufferSourceNode`.

## Pipeline Parallelism
- Start LLM as soon as STT finishes.
- Start TTS as soon as first LLM sentence is ready.
- Do not wait for full responses before starting the next stage.
