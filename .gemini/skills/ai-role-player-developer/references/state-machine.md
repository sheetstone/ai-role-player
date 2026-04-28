# Session State Machine

## States
1. **Idle**: Gray. Initial state or ready for new session.
2. **Listening**: Red Pulse. Mic is active, capturing user audio.
3. **Processing**: Amber Spinner. STT/LLM/TTS pipeline is running.
4. **Speaking**: Blue Wave. AI audio is playing.
5. **Paused**: Orange Static. Session halted by user.
6. **Ended**: Green Static. Session complete, ready for feedback.

## Key Actions
- `START_SESSION`: Transition to `Listening`.
- `STOP_RECORDING`: Transition to `Processing` (within 300ms).
- `FIRST_AUDIO_CHUNK`: Transition to `Speaking`.
- `AUDIO_COMPLETE`: Transition back to `Listening`.
- `INTERRUPT`: If in `Speaking`, stop audio and transition to `Listening`/`Recording`.
- `PAUSE/RESUME`: Toggle between current state and `Paused`.

## Implementation
- Managed via React Context + `useReducer`.
- Actions must be dispatched synchronously for UI updates.
