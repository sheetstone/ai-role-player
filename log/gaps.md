# Known Gaps

Gaps identified during code/spec review on 2026-04-28. Each entry has a severity and the context needed to fix it.

---

## GAP-01 — FP-F04: Context window compression not implemented

**Severity:** P1  
**File:** `backend/src/agents/personaAgent.ts`

All session turns are forwarded to Gemini as-is. The spec requires compressing older turns into a summary after 10 turns (keeping last 5 verbatim) to prevent token limit overflow.

**What to build:**
- `buildHistory(turns: Turn[]): Content[]` helper in `personaAgent.ts`
- If estimated token count > 6000: keep last 5 turns verbatim; call Claude/Gemini to summarise earlier turns into one context message: "Earlier in the conversation: [summary]"
- No change visible to the user — transcript panel always shows full history

**When it breaks:** Sessions longer than ~20 turns may hit Gemini's context window limit and return an error.

---

## GAP-02 — FP-G03: Volume preference not persisted to localStorage

**Severity:** Minor  
**File:** `frontend/src/hooks/useAudioPlayer.ts`

Volume slider resets to 100% on every page load/session. The spec says "Volume preference persisted in `localStorage`".

**What to build:**
- On mount: read `localStorage.getItem('ai-role-player:volume')`, initialise `volumeRef` and state to the saved value.
- In `setVolume`: write `localStorage.setItem('ai-role-player:volume', clamped.toString())`.

---

## GAP-03 — SessionContext `error` field never cleared

**Severity:** Minor  
**File:** `frontend/src/context/SessionContext.tsx`

The `ERROR` action sets `ctx.error`. No subsequent action ever resets it to `null`. A stale error message survives after the session recovers (e.g., successful turn after a failed STT).

**What to build:**
- Add `error: null` to `ADD_TURN`, `STOP_RECORDING`, and `AUDIO_COMPLETE` case returns in the reducer, or
- Add a dedicated `CLEAR_ERROR` action.
- Either way, the `error` field should be cleared on any successful forward progress.

---

## GAP-04 — useStreamingTranscript timeout scope is too narrow

**Severity:** Minor  
**File:** `frontend/src/hooks/useStreamingTranscript.ts`

The 8-second `AbortController` timeout is `clearTimeout`-ed immediately after the HTTP response header arrives (`await voiceApi.openChatTurn()`). If the backend accepts the connection but then stalls before sending the first SSE `data:` event, the timeout has already been cleared and the client hangs indefinitely.

**What to build:**
- Split into two timeouts: a 5s connection timeout (cleared after HTTP response) and a separate 8s "first token" timeout (cleared after the first `data:` line is parsed).
- Or use a single rolling deadline reset on each received chunk.
