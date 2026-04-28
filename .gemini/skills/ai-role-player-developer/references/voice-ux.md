# Voice UX & Latency Standards

## Latency Targets
- **Visual Feedback**: < 300ms after recording stops (Transition to 'Processing').
- **Partial Transcript**: < 1.5s (STT streaming/mock).
- **Time to First Audio (TTFA)**: < 2.5s (LLM first token + TTS chunking).
- **Interruption**: < 200ms to stop playback when user speaks.

## Interaction Patterns
- **Push-to-Talk (PTT)**: Preferred for sales training. Hold to record, release to submit.
- **Tap-to-Record**: Toggle mode. Tap to start, tap to stop.
- **Earcons**: Use short oscillator tones (Web Audio API) for state transitions to reduce perceived latency.
- **Waveform**: Live animated waveform reacting to mic amplitude is mandatory for "alive" feel.

## Error Handling
- Never blame the user. Use phrases like "I didn't catch that, let's try again."
- Offer text fallback after 2 consecutive STT failures.
- Silent retry on transient API errors (timeout/500) before surfacing to user.
