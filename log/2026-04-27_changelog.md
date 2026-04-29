# Changelog — 2026-04-27

## Session Recap

Two work streams completed in this session:
1. Design system update (Bento theme)
2. FP-C — Voice Recording (all 6 function points)

---

## 1. Design System Update — Bento Theme

**Source:** `DESIGN.md`

**Motivation:**  
The existing design used a dark purple/orange theme. `DESIGN.md` specified a "Bento" design system — light, warm, modern — with a completely different color palette, radius, and typography scale.

### Files changed

#### `frontend/src/styles/variables.css` — full rewrite

| Token group | Before | After |
|---|---|---|
| Page background (`--bg`) | `#09090B` (near-black) | `#FFF5E6` (warm cream) |
| Card surface (`--surface`) | `#111113` (dark) | `#FFFFFF` (white) |
| Input surface (`--surface-2/3`) | dark zinc shades | warm off-white shades |
| Borders | dark zinc | warm sand (`#E8D5C0`, `#F2E8DC`) |
| Text (`--text-1`) | `#FAFAFA` (white) | `#111827` (near-black) |
| Text (`--text-2/3/4`) | light gray shades | dark/medium gray shades |
| Brand / voice state (`--brand`, `--cyan`) | `#8B5CF6` purple | `#80A1C1` muted steel blue |
| Primary CTA / accent (`--orange`) | `#F97316` orange | `#C4784A` warm coral (derived from `#FAD4C0` primary, darkened for WCAG AA contrast ~5.8:1 with white text) |
| Success (`--green`) | `#10B981` | `#16A34A` (DESIGN.md exact) |
| Warning (`--amber`) | `#F59E0B` | `#D97706` (DESIGN.md exact) |
| Danger (`--red`) | `#EF4444` | `#DC2626` (DESIGN.md exact) |
| Radius sm/md | 6px / 10px | 4px / 8px (DESIGN.md spec) |
| Shadows | pure-black rgba | dark-text-color rgba (lighter, appropriate for light mode) |
| Font mono | Cascadia Code first | JetBrains Mono first (DESIGN.md spec) |
| `--text-xs` | 0.6875rem (11px) | 0.75rem (12px — matches DESIGN.md 12/14/16/20/24/32 scale) |

#### `frontend/src/index.css`
- `::selection` background changed from `--brand-subtle` (purple tint) to `--orange-subtle` (warm peach tint)
- Scrollbar thumb hover updated to use `--border-subtle` instead of `--text-4`

#### `frontend/src/pages/DashboardPage.module.css`
- Start button `box-shadow` hardcoded rgba updated from `rgba(249,115,22,…)` (orange) to `rgba(196,120,74,…)` (coral)
- Same fix for hover state shadow

#### `frontend/src/components/dashboard/Dashboard.module.css`
- Overlay backdrop lightened from `rgba(0,0,0,0.8)` to `rgba(17,24,39,0.45)` (appropriate for light-mode overlay)
- Overlay button `box-shadow` rgba updated to coral

---

## 2. FP-C — Voice Recording

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain C (FP-C01 – FP-C06)

### Files created

#### `frontend/src/hooks/useVoiceRecorder.ts` (FP-C01, C02, C03, C04, C05, C06)

Core recording hook. Owns all recording logic; components receive state as props.

Key design decisions:
- `cancelledRef` flag prevents blob emission on cancel without needing a second state variable
- Timer runs via `setInterval` with a local `secs` counter (not state, to avoid stale closure in the interval callback)
- `AnalyserNode` created once when permission is granted and reused across recordings; exposed to `WaveformCanvas`
- `mimeType` detected at record-start via `MediaRecorder.isTypeSupported()` — prefers `audio/webm;codecs=opus`, falls back to `audio/webm`, then lets the browser decide
- `toastMessage: string | null` unifies "Hold to record" (short tap) and "Max recording length reached" (30s cap) into a single prop
- Mode persisted to `localStorage` under key `ai-role-player:record-mode`
- Cleanup `useEffect` stops the stream tracks and closes the `AudioContext` on unmount

Exported interface:

```
permissionState: 'unknown' | 'requesting' | 'granted' | 'denied'
requestPermission()
isRecording: boolean
recordingSeconds: number
mode: 'ptt' | 'toggle'
setMode(m)
pttStart() / pttEnd()
toggleRecord()
cancel()
analyserNode: AnalyserNode | null
toastMessage: string | null
```

#### `frontend/src/components/session/WaveformCanvas.tsx` (FP-C04)

- Canvas 280×48px, `requestAnimationFrame` loop at 60fps
- Active waveform: `getByteTimeDomainData`, smooth line in `#C4784A` (--orange)
- Idle state: flat center line in `#E8D5C0` (--border) — gives visual affordance of the waveform area
- Cleanup: `cancelAnimationFrame` on effect teardown

#### `frontend/src/components/session/MicPermissionGuide.tsx` + `.module.css` (FP-C01)

- Detects browser from `navigator.userAgent` (Chrome / Firefox / Safari / other)
- Shows 3-step browser-specific recovery instructions
- "Try again" button calls `requestPermission()` again (re-attempts `getUserMedia`)
- `role="alert" aria-live="assertive"` for screen reader announcement

#### `frontend/src/components/session/VoicePanel.tsx` + `.module.css` (FP-C02, C03, C05, C06)

- Hold/Tap mode toggle pill (persisted, top-right of card)
- `WaveformCanvas` embedded
- Recording timer (mm:ss + pulsing red dot), visible only while recording
- Large circular mic button: neutral idle state → red pulsing ring animation when recording
- Cancel button with `Esc` keyboard shortcut badge, visible only while recording
- `Escape` key handler via `window.addEventListener` (only active when recording)
- `handlePointerDown` only calls `e.preventDefault()` in PTT mode, so toggle mode still receives the `click` event
- Toast notification anchored fixed to bottom-center of viewport

#### `frontend/src/pages/SessionPage.tsx` — rewrite (FP-C01, C02)

- Requests mic permission on mount (`permissionState === 'unknown'`)
- Renders three states: `denied` → `MicPermissionGuide`, `granted` → `VoicePanel`, else → "Requesting…"
- `onBlob` callback dispatches `STOP_RECORDING` synchronously (satisfies FP-E02 ≤300ms rule — wired when STT is implemented)
- Voice panel disabled when session state is `processing`, `speaking`, or `ended`
- Guard for no active session (redirects to dashboard link)

#### `frontend/src/pages/SessionPage.module.css`

Layout for session page header (scenario + persona meta, nav links) and page shell.

### Bug fix (pre-existing)

#### `frontend/src/services/api.ts`
- `ApiRequestError` constructor used TypeScript parameter properties (`public readonly status`) which is disallowed under `erasableSyntaxOnly: true` in `tsconfig.app.json`
- Fixed by declaring `readonly status: number` as a class field and assigning in the constructor body

---

---

## 3. FP-D — Session State Machine

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain D (FP-D01 – FP-D03)

FP-D01 (SessionContext + useReducer) was already complete from prior work.

### Files created

#### `frontend/src/components/session/SessionStateIndicator.tsx` + `.module.css` (FP-D02)

Always-visible pill/badge showing the current session state. Reads `state` directly from `SessionContext`.

| State | Colour | Animation | Label |
|---|---|---|---|
| `idle` | grey | static dot | Ready |
| `listening` | red | pulsing dot (radial ring) | Listening… |
| `processing` | amber | spinning arc | Processing… |
| `speaking` | muted blue | 3-bar wave (staggered) | Speaking… |
| `paused` | coral | static dot | Paused |
| `ended` | green | static dot | Session Ended |

Design decisions:
- Compound CSS-Module selectors (`.state .child`) don't work for same-element styling, so dot colour is applied via explicit modifier classes (`dotIdle`, `dotListening`, etc.) rather than inherited from the pill container
- Indicator type is driven by a `STATE_CONFIG` lookup table — no `switch` in render
- `role="status" aria-live="polite"` announced every state change to screen readers

#### `frontend/src/hooks/useEarcons.ts` (FP-D03)

Plays short oscillator tones on the 4 key state transitions using `Web Audio API`. No audio files — pure synthesis via `createOscillator`.

| Transition | Sound | Freq | Duration | Wave |
|---|---|---|---|---|
| `idle → listening` | Soft rising | 350→700Hz | 300ms | sine |
| `listening → processing` | Neutral click | 1000Hz | 50ms | triangle |
| `processing → speaking` | Gentle chime | 600→1200Hz | 200ms | sine |
| `speaking → listening` | Soft descending | 700→350Hz | 300ms | sine |

Design decisions:
- `AudioContext` created lazily on first transition (not on mount) to avoid browser autoplay restrictions
- `audioCtx.resume()` called before playback to handle suspended context state
- `prevStateRef` starts `null`; first state assignment is treated as mount, not a transition — prevents spurious earcon on page load
- `muted` parameter (default `false`) forwards-compatible with FP-G02's volume control; `SessionPage` will pass the muted flag when FP-G02 is implemented

### Files modified

#### `frontend/src/pages/SessionPage.tsx`
- Added `useEarcons(state)` call (FP-D03)
- Added `<SessionStateIndicator />` between the header and the voice panel (FP-D02)

---

## 4. Dashboard — Pill-based Selection

**Motivation:**  
Improve the user experience for selecting scenarios and personas by providing preloaded, clickable "pills" instead of requiring search/dropdown interaction for every selection. This makes the most common choices immediately available and discoverable.

### Files modified

#### `frontend/src/components/dashboard/Dashboard.module.css`
- Added `.pillContainer` for flexible wrapping of preloaded options.
- Added `.pillBtn` and `.pillBtnActive` styles following the Bento design system (radius-full, orange accent).
- Added `:disabled` and `:hover` states for interactive feedback.

#### `frontend/src/components/dashboard/ScenarioSelector.tsx`
- Added preloaded pills container below the search input.
- Displays up to 10 available scenarios as clickable pills.
- Integrates with existing `onSelect` logic for seamless transition between pills and search dropdown.

#### `frontend/src/components/dashboard/PersonaSelector.tsx`
- Added preloaded pills container for compatible personas.
- Enforced a 10-item limit for preloaded options as requested.
- Filters pills based on `selectedScenario` compatibility, ensuring only valid combinations are presented to the user.

---

## 5. FP-E — STT Pipeline

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain E (FP-E01 – FP-E03)

### Files created

#### `backend/src/routes/audio.ts` (FP-E01)
- Implemented `POST /api/audio/transcribe` endpoint.
- Uses `multer` for multi-part form data handling (temporary file storage in `uploads/`).
- Integrates `OpenAI Whisper` (`whisper-1` model) for high-accuracy speech-to-text.
- Automatic cleanup of temporary audio files after processing or on error.

#### `frontend/src/components/session/SttFallbackInput.tsx` (FP-E03)
- Text input component that appears after repeated STT failures.
- Allows users to continue the role-play via manual text entry (Lesson 5: "own the failure, provide an escape hatch").
- Styled to match the Bento design system.

### Files modified

#### `backend/src/index.ts`
- Registered the `audioRouter` at `/api/audio`.

#### `frontend/src/pages/SessionPage.tsx` (FP-E02, FP-E03)
- Implemented `handleTranscribe` callback using `voiceApi.transcribe`.
- Wired `onBlob` from `useVoiceRecorder` to trigger the transcription pipeline.
- Implemented error recovery logic: tracking `sttErrorCount` and showing `SttFallbackInput` after 2 failures.
- Synchronous state transition to `processing` within 300ms of recording stop.

#### `frontend/src/components/session/VoicePanel.module.css`
- Added styles for the fallback text input container and its children.

---

## 6. Gemini Migration & FP-F — LLM Persona Agent

**Motivation:**  
Switched the backend AI stack from OpenAI to **Google Gemini** to utilize a single API key for both multi-modal transcription (STT) and conversational responses (LLM).

### Files created

#### `backend/src/agents/personaAgent.ts` (FP-F01, FP-F02)
- Implemented `streamTurn` using `@google/generative-ai`.
- Uses `gemini-1.5-flash` for low-latency responses.
- Encapsulates complex system prompt logic (Persona Identity, Scenario Context, Difficulty Level, and Conversation Phases).
- Uses `generateContentStream` for real-time token delivery to the frontend.

#### `backend/src/routes/chat.ts` (FP-F02)
- Implemented `POST /api/chat/turn` SSE endpoint.
- Orchestrates data loading (personas/scenarios) and stream generation.
- Correctly formats `text/event-stream` chunks for consumption by the `useStreamingTranscript` hook.

#### `frontend/src/hooks/useStreamingTranscript.ts` (FP-F03)
- Custom hook to manage SSE connection and incremental transcript updates.
- Synchronizes with `SessionContext` to add and update partial AI turns.
- Includes auto-cancellation of previous streams to prevent race conditions.

### Files modified

#### `backend/src/routes/audio.ts` (FP-E01 refactor)
- Refactored transcription endpoint to use Gemini 1.5 Flash's native audio processing instead of OpenAI Whisper.
- Supports `audio/webm` and `audio/wav` via base64 encoding.

#### `backend/package.json`
- Added `@google/generative-ai`.
- Removed `openai`.

#### `frontend/src/pages/SessionPage.tsx`
- Integrated `useStreamingTranscript` hook.
- Added `useEffect` to trigger AI response automatically when a completed user turn is detected in the state machine.

---

## Status after this session

| FP | Description | Status |
|---|---|---|
| FP-A01–A06 | Infrastructure & Scaffold | ✅ Done (prior work) |
| FP-B01–B05 | Learner Dashboard | ✅ Done (prior work) |
| FP-C01 | Mic permission + denial handler | ✅ Done |
| FP-C02 | Push-to-talk (PTT) mode | ✅ Done |
| FP-C03 | Tap-to-record toggle mode | ✅ Done |
| FP-C04 | Live waveform / input level meter | ✅ Done |
| FP-C05 | Recording timer + 30s auto-stop | ✅ Done |
| FP-C06 | Cancel recording | ✅ Done |
| FP-D01 | SessionContext + useReducer state machine | ✅ Done (prior work) |
| FP-D02 | Session state visual indicator | ✅ Done |
| FP-D03 | Audio earcons | ✅ Done |
| FP-E01–E03 | STT pipeline | ✅ Done (Refactored to Gemini) |
| FP-F01–F03 | LLM Persona Agent (streaming SSE, system prompt, transcript hook) | ✅ Done (Gemini) |
| FP-F04 | Context window compression | ⚠️ Not implemented (P1 gap — all turns sent raw; safe for demo-length sessions) |
| FP-G01–G04 | TTS Playback | ✅ Done |
| FP-H01–H03 | Transcript Panel | ✅ Done |
| FP-I01–I06 | Session Controls & Robustness | ⬜ Pending |
| FP-J01–J07 | Feedback & Export | ⬜ Pending |
| FP-K01–K08 | Admin Console | ⬜ Pending |
| FP-L01–L02 | Documentation | ⬜ Pending |

## Next step

**FP-H — Transcript Panel** (real-time scrolling transcript with auto-scroll, streaming cursor, and jump-to-latest).

---

---

## Session 2 — 2026-04-28

Two work streams completed in this session:
1. Bug fixes from cross-session review (5 bugs)
2. FP-G — Voice Pipeline: TTS Playback (all 4 function points)

---

## 7. Pre-implementation Bug Fixes

Five bugs found during spec/code review before starting FP-G.

### Bug 1 (Critical) — Backend startup crash
**File:** `backend/src/index.ts`  
**Issue:** `import './check_models'` referenced a file that never existed, crashing the server on every startup.  
**Fix:** Removed the import.

### Bug 2 (Critical) — Multi-turn conversation broken
**File:** `backend/src/agents/personaAgent.ts`  
**Issue:** `model.startChat({ history: ... })` was called and the `chat` object (which correctly formatted the conversation history) was then discarded. `modelWithSystem.generateContentStream(userText)` was called instead — with no history — so the AI had no memory of previous exchanges in a session.  
**Fix:** Reordered to create `modelWithSystem` first, then call `modelWithSystem.startChat({ history })` on it, then `chat.sendMessageStream(userText)`. Also added `.filter(t => !t.partial)` to exclude in-flight partial turns from history.

### Bug 3 (TypeScript compile error) — Missing type imports
**File:** `backend/src/routes/chat.ts`  
**Issue:** `Persona` and `Scenario` used as inline type annotations without being imported.  
**Fix:** Added `import type { Persona, Scenario } from '../types/index.js'`.

### Bug 4 (Logic) — Manual text fallback never triggered AI
**File:** `frontend/src/pages/SessionPage.tsx`  
**Issue:** `handleManualSubmit` dispatched `ADD_TURN` while state was `'listening'`. The `useEffect` that triggers `streamTurn` guards on `state !== 'processing'`, so the AI call was silently skipped after every manual text submission.  
**Fix:** Added `dispatch({ type: 'STOP_RECORDING' })` before `ADD_TURN` in `handleManualSubmit`, which transitions state to `processing` and allows the effect to fire.

### Bug 5 (TypeScript) — Missing `partial` field on user turns
**File:** `frontend/src/pages/SessionPage.tsx`  
**Issue:** Two `ADD_TURN` dispatches for user turns omitted `partial: false`. Since `Turn.partial: boolean` is required (not optional), this caused TypeScript compile errors.  
**Fix:** Added `partial: false` to both dispatch calls.

### Supporting type fix
**File:** `frontend/src/types/index.ts`  
**Issue:** `ChatTurnRequest.history` was typed as `{ role: 'user' | 'assistant'; content: string }[]` but the frontend was passing `Turn[]`. The backend's `personaAgent.ts` expected and mapped from `Turn` shape.  
**Fix:** Changed to `Pick<Turn, 'id' | 'speaker' | 'text' | 'timestamp' | 'partial'>[]`.

---

## 8. FP-G — TTS Playback

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain G (FP-G01 – FP-G04)

### Files created

#### `backend/src/routes/tts.ts` (FP-G01)

Backend TTS endpoint using Gemini `gemini-2.5-flash-preview-tts`.

Key design decisions:
- **Voice mapping:** Persona data uses OpenAI voice names (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`). Mapped to Gemini TTS voices: `Aoede`, `Charon`, `Kore`, `Fenrir`, `Puck`, `Zephyr`. Fallback to `Aoede` if unknown.
- **PCM → WAV conversion:** Gemini TTS returns raw 16-bit LE PCM with `Content-Type: audio/L16;rate=24000`, which browsers cannot decode with `AudioContext.decodeAudioData()`. The route detects `audio/L16` or `audio/pcm` MIME types and wraps the payload in a standard 44-byte WAV header before sending, with sample rate parsed from the MIME type. Response becomes `audio/wav`.
- **`as any` for TTS config:** The `@google/generative-ai` SDK v0.24.1 doesn't type `responseModalities` or `speechConfig` in `GenerationConfig` — these are TTS-specific extensions. Passing via `(model as any).generateContent({...})` to work around the type gap.

`pcmToWav(pcm, sampleRate, channels=1, bitsPerSample=16)` utility: writes RIFF/WAVE/fmt/data chunks as little-endian per WAV spec. Verified correct with `xxd` inspection of the 44-byte header.

#### `frontend/src/hooks/useAudioPlayer.ts` (FP-G02, FP-G04, FP-I06)

Core audio playback hook. All state managed via refs for stable callbacks; volume/muted duplicated to React state for rendering.

Key design decisions:
- **`stop()` is synchronous** — nulls `sourceRef.current` *before* calling `AudioBufferSourceNode.stop()`, so when `onended` fires it sees `sourceRef.current !== source` and skips `AUDIO_COMPLETE`. The caller (interrupt handler in SessionPage) dispatches `SKIP_AI` instead.
- **`onended` guard** — prevents `AUDIO_COMPLETE` from firing on interrupted playback without needing a separate "was interrupted" flag.
- **`getOrCreateCtx()`** — lazily creates `AudioContext` on first play, applies current volume/muted state to the new `GainNode` immediately.
- **10s abort timeout** — `AbortController` aborts the TTS fetch after 10 seconds (FP-I05). `clearTimeout` called immediately after the HTTP response arrives.
- **Decode error handling** — `try/catch` around `decodeAudioData` dispatches `ERROR` and calls `onTtsError` callback without crashing the session (FP-I06).
- **`finally` abort ref guard** — `if (abortRef.current === abortController)` prevents clearing a ref that a concurrent `play()` call has already replaced.

Dispatch sequence for normal playback: `FIRST_AUDIO_CHUNK` (→ speaking) → audio plays → `AUDIO_COMPLETE` (→ listening).  
Dispatch sequence for interrupt: caller calls `stop()` + `SKIP_AI` (→ listening) — no AUDIO_COMPLETE.

#### `frontend/src/components/session/PlaybackControls.tsx` + `.module.css` (FP-G03)

Playback controls toolbar. Pure presentational — no direct context reads; all state passed as props.

- Mute/unmute: SVG icon toggle button (IconVolume ↔ IconMute). `aria-label` updates with state.
- Volume slider: `<input type="range">` 0–100, disabled when muted, calls `onVolumeChange(v/100)`.
- Volume label: shows percentage or "Muted" text.
- Skip button: SVG skip icon + "Skip" label. Calls `onSkip` which does `stop() + dispatch(SKIP_AI)` in SessionPage.
- Rendered conditionally in SessionPage only when `state === 'speaking'`.

### Files modified

#### `frontend/src/services/voiceApi.ts`
- Added optional `signal?: AbortSignal` parameter to `speak()` for abort/timeout support.

#### `frontend/src/hooks/useStreamingTranscript.ts`
- Changed `streamTurn` return type from `void` to `Promise<string | null>` — returns `fullText` on success so the caller can chain TTS.
- Added 8s `AbortController` timeout for the initial SSE fetch (FP-I05).
- Added empty response guard: if `data.fullText.trim() === ''` after stream completes, updates turn text to `'[No response]'`, dispatches `ERROR`, returns `null` (FP-F03).
- Improved malformed SSE handling: inner `catch` re-throws non-`SyntaxError` exceptions so real errors reach the outer handler; only JSON parse failures are swallowed silently.

#### `frontend/src/pages/SessionPage.tsx`
- Integrated `useAudioPlayer` — wired to TTS via `runTurnRef.current` pattern. The ref is updated every render with the latest `streamTurn` and `play` functions; the `useEffect` depends only on `session?.turns.length` and `state`, preventing unnecessary re-fires.
- **FP-D03 fix:** `useEarcons(state, isMuted)` — earcons now silenced when AI audio is muted.
- **Interruption (FP-G04):**
  - `handlePttStart`: if `state === 'speaking'` → `stop() + SKIP_AI + pttStart()` (single synchronous call chain).
  - `handleToggleRecord`: if `state === 'speaking'` → `stop() + SKIP_AI + return` (two-tap model — first tap stops only).
- `voiceDisabled` no longer includes `'speaking'` — mic button stays enabled for interruption.
- Added TTS error toast (`ttsErrorToast`) with 4s auto-dismiss via `useEffect`.
- `PlaybackControls` mounted when `state === 'speaking'`.

#### `backend/src/index.ts`
- Registered `ttsRouter` at `/api/tts`.

#### `frontend/src/components/session/SttFallbackInput.tsx`
- Changed `import { useState, FormEvent }` to `import { useState, type FormEvent }` to satisfy `verbatimModuleSyntax` compiler option.

---

## Known gaps after this session

| Gap | Severity | Notes |
|---|---|---|
| FP-F04: context window compression | P1 | All turns sent to LLM raw. Safe for ≤~20 turn demo sessions. |
| FP-G03: volume not persisted | Minor | `localStorage` write for volume preference not implemented. |
| `SessionContext.error` never cleared | Minor | Stale error survives after recovery. Not visible to users yet. |
| `useStreamingTranscript` timeout scope | Minor | 8s timeout guards HTTP handshake, not first SSE token. |

---

## Status after session 2

| FP | Description | Status |
|---|---|---|
| FP-A01–A06 | Infrastructure & Scaffold | ✅ Done |
| FP-B01–B05 | Learner Dashboard | ✅ Done |
| FP-C01–C06 | Voice Recording | ✅ Done |
| FP-D01–D03 | Session State Machine | ✅ Done |
| FP-E01–E03 | STT Pipeline | ✅ Done |
| FP-F01–F03 | LLM Persona Agent | ✅ Done |
| FP-F04 | Context window compression | ⚠️ Skipped (P1, safe to defer) |
| FP-G01 | Backend TTS endpoint | ✅ Done |
| FP-G02 | Frontend audio player hook | ✅ Done |
| FP-G03 | Playback controls UI | ✅ Done |
| FP-G04 | Real interruption | ✅ Done |
| FP-H01–H03 | Transcript Panel | ✅ Done |
| FP-I01–I06 | Session Controls & Robustness | ⬜ Pending |
| FP-J01–J07 | Feedback & Export | ⬜ Pending |
| FP-K01–K08 | Admin Console | ⬜ Pending |
| FP-L01–L02 | Documentation | ⬜ Pending |

## Next step

**FP-I — Session Controls & Robustness** (FP-I01–I06): Pause/Resume, End Session, Restart, retry toasts, and timeout handling.

---

---

## Session 3 — 2026-04-28 (continued)

Work completed:
1. Gaps documented in `log/gaps.md`
2. FP-H — Transcript Panel (H01–H03)

---

## 9. Gap documentation

Four known gaps from the cross-session review written to `log/gaps.md` with severity, root cause, and concrete fix description for each. Gaps are deferred; the file is the single source of truth for outstanding technical debt.

---

## 10. FP-H — Transcript Panel

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain H (FP-H01 – FP-H03)

### Files created

#### `frontend/src/components/session/TranscriptPanel.tsx` + `.module.css` (FP-H01, FP-H02, FP-H03)

All three H function points implemented in one component.

**FP-H01 — Real-time streaming transcript:**
- `role="log" aria-live="polite"` scroll container with `min-height: 240px; max-height: 44vh; overflow-y: auto`.
- Turns rendered as a `<ul>` — user turns left-aligned (coral/orange bubble), persona turns right-aligned (muted blue bubble). Asymmetric `border-radius` (`border-bottom-left-radius` on user, `border-bottom-right-radius` on persona) gives a chat-message "tail" effect.
- Each turn: speaker label + `HH:MM:SS` elapsed timestamp (derived from `turn.timestamp - session.startedAt`) + text.
- Partial turns show a 2px blinking cursor (`@keyframes blink` with `step-end` timing) as a styled `<span>` after the text.
- Empty state: "Conversation will appear here once you start speaking."

**Auto-scroll design (FP-H01):**
- `pinnedRef` (a `useRef<boolean>`, not state) tracks whether to auto-scroll. Avoids re-renders on scroll events.
- `useEffect` on `turns`: if `pinnedRef.current === true`, sets `el.scrollTop = el.scrollHeight` directly (instant, no animation, so it doesn't fight the user during fast streaming).
- `onScroll` handler: recalculates `distFromBottom = scrollHeight - scrollTop - clientHeight`; sets `pinned = distFromBottom ≤ 100`. Updates `pinnedRef` and a `showJump` state boolean.

**FP-H02 — Live AI captions:**
- `activeTurnId` prop received from `SessionPage`. When `state === 'speaking'`, `SessionPage` computes: `session.turns.slice().reverse().find(t => t.speaker === 'persona' && !t.partial)?.id`.
- The matching turn's bubble gets `.bubbleActive`: amber border + `--amber-subtle` background + amber glow ring (`box-shadow: 0 0 0 2px var(--amber-border)`).
- Highlight appears immediately when audio starts (FIRST_AUDIO_CHUNK → speaking state) and disappears on AUDIO_COMPLETE or SKIP_AI. No sentence-level animation — the spec permits whole-turn granularity ("sentence-level sufficient").

**FP-H03 — Scroll memory + Jump to latest:**
- `showJump` state drives a floating "↓ Jump to latest" pill button, absolutely positioned at bottom-center of the wrapper.
- Click: `el.scrollTo({ behavior: 'smooth', top: scrollHeight })` + resets `pinnedRef.current = true` + hides button.
- Auto-hides when user scrolls back within 100px of the bottom.

### Files modified

#### `frontend/src/pages/SessionPage.tsx`
- Imported `TranscriptPanel`.
- Added `activeTurnId` computation (persona turn currently spoken, null otherwise).
- Inserted `<TranscriptPanel turns={session.turns} sessionStartedAt={session.startedAt} activeTurnId={activeTurnId} />` between `<SessionStateIndicator />` and playback controls.

---

## Status after session 3

| FP | Description | Status |
|---|---|---|
| FP-A01–A06 | Infrastructure & Scaffold | ✅ Done |
| FP-B01–B05 | Learner Dashboard | ✅ Done |
| FP-C01–C06 | Voice Recording | ✅ Done |
| FP-D01–D03 | Session State Machine | ✅ Done |
| FP-E01–E03 | STT Pipeline | ✅ Done |
| FP-F01–F03 | LLM Persona Agent | ✅ Done |
| FP-F04 | Context window compression | ⚠️ Deferred (see gaps.md) |
| FP-G01–G04 | TTS Playback | ✅ Done |
| FP-H01 | Real-time streaming transcript | ✅ Done |
| FP-H02 | Live AI captions (speaking highlight) | ✅ Done |
| FP-H03 | Scroll memory + Jump to latest | ✅ Done |
| FP-I01–I06 | Session Controls & Robustness | ⬜ Next |
| FP-J01–J07 | Feedback & Export | ⬜ Pending |
| FP-K01–K08 | Admin Console | ⬜ Pending |
| FP-L01–L02 | Documentation | ⬜ Pending |

## Next step

**FP-I — Session Controls & Robustness** (FP-I01–I06): Pause/Resume, End Session, Restart, retry toasts, and timeout handling.

---

---

## Session 4 — 2026-04-28 (continued)

Work completed:
1. Bugs from GAP-03 fix (SessionContext error clearing) + service retry layer
2. FP-I — Session Controls & Robustness (I01–I06)

---

## 11. FP-I pre-work: Error clearing + retry layer

### GAP-03 fix — SessionContext error never cleared
**File:** `frontend/src/context/SessionContext.tsx`  
**Issue:** `ctx.error` was only ever set (via the ERROR action) and never cleared. A stale error message persisted through subsequent successful turns.  
**Fix:** Added `error: null` to three reducer cases: `ADD_TURN` (successful user turn), `AUDIO_COMPLETE` (natural TTS end), and `SKIP_AI` (interrupt). Any of these confirms forward progress and clears the stale error.

### Retry layer — `retryFetch`
**File:** `frontend/src/services/api.ts`  
Added `retryFetch(url, options, maxAttempts=2)`: raw `fetch` wrapper with one silent retry for 5xx responses or network errors. Never retries `AbortError` (intentional cancellation) or 4xx (client error — retrying won't help). 1s delay between attempts.

**File:** `frontend/src/services/voiceApi.ts`  
- `transcribe()` now uses `retryFetch` instead of bare `fetch`.
- `speak()` now uses `retryFetch` and accepts an optional `signal?: AbortSignal`.

---

## 12. FP-I — Session Controls & Robustness

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain I (FP-I01 – FP-I06)

### Files created

#### `frontend/src/components/session/SessionControls.tsx` + `.module.css` (FP-I01, FP-I02, FP-I03)

Toolbar with three controls: Pause/Resume, Restart, End.

**FP-I01 — Pause/Resume:**
- Toggle button labelled "⏸ Pause" / "▶ Resume" with `aria-label` and a keyboard shortcut hint in `title`.
- `onPause` handler in SessionPage: `cancel()` (abort any in-progress recording) + `stop()` (abort TTS) + `PAUSE_SESSION`.
- `onResume` handler: `RESUME_SESSION` — returns to `listening`.
- Space key handler (inside `SessionControls`): fires `onPause` or `onResume` when Space is pressed while focus is not on a form element. Clears any pending confirmation first.

**FP-I02 — End session:**
- "■ End" button with red styling. First click shows an inline confirmation group ("End session? Yes / No") — no browser `confirm()` dialogs.
- On "Yes": `stop() + cancel() + END_SESSION + navigate('/feedback')`.
- Confirming state locks out the other destructive button via `disabled`.

**FP-I03 — Restart:**
- "↺ Restart" button with inline confirmation (same pattern as End).
- On "Yes": saves `{ scenario, persona, difficulty }` from current session, then `RESET + START_SESSION` with same config.

**SessionControls** is hidden (`return null`) when `state === 'idle'` or `state === 'ended'`.

#### `frontend/src/components/session/ErrorToast.tsx` + `.module.css` (FP-I04)

Unified error toast rendered at fixed `bottom: 1.5rem; left: 50%` (centered), `z-index: 200`.

- Dark pill (`#1f2937` background, white text), animated `slideUp` 0.2s on mount.
- `autoDismissMs` (default 6000ms) auto-dismiss via `setTimeout` — cleared on unmount.
- Optional "Retry" button (coral `--orange`): calls `onRetry()` then `onDismiss()`.
- Dismiss (✕) button always present.
- `role="alert" aria-live="assertive"` for screen reader announcement.

### Files modified

#### `frontend/src/pages/SessionPage.tsx`

**Unified error toast state:**  
Replaced the `ttsError` string state with `errorToast: { message: string; onRetry?: () => void } | null`.  
- TTS errors (from `useAudioPlayer.onTtsError`) → `setErrorToast({ message })`.  
- Context errors (from `useSession().error`) → `useEffect` watches `error`, populates `errorToast` with optional retry.

**LLM retry mechanism:**  
When a context error fires after an LLM failure, `errorToast.onRetry` is set to `() => dispatch({ type: 'STOP_RECORDING' })`. This transitions state from `listening` back to `processing`, which causes the existing `useEffect` to re-fire and call `runTurnRef.current(lastUserTurn.text)` automatically — no direct `runTurnRef` call needed from the retry handler.

**Pause disabled during paused/ended:**  
`voiceDisabled` now also includes `state === 'paused'` so the mic button is inactive while paused.

**`<SessionControls>`** mounted after `<SessionStateIndicator>`, before `<TranscriptPanel>`.  
**`<ErrorToast>`** rendered at the bottom of the JSX tree (outside the layout flow, fixed position).

**Removed:** `ttsErrorToast` inline div + the 4s `setTimeout` auto-dismiss effect.  
**Removed:** `.ttsErrorToast` from `SessionPage.module.css`.

---

## Status after session 4

| FP | Description | Status |
|---|---|---|
| FP-A01–A06 | Infrastructure & Scaffold | ✅ Done |
| FP-B01–B05 | Learner Dashboard | ✅ Done |
| FP-C01–C06 | Voice Recording | ✅ Done |
| FP-D01–D03 | Session State Machine | ✅ Done |
| FP-E01–E03 | STT Pipeline | ✅ Done |
| FP-F01–F03 | LLM Persona Agent | ✅ Done |
| FP-F04 | Context window compression | ⚠️ Deferred (see gaps.md) |
| FP-G01–G04 | TTS Playback | ✅ Done |
| FP-H01–H03 | Transcript Panel | ✅ Done |
| FP-I01 | Pause / Resume (Space key shortcut) | ✅ Done |
| FP-I02 | End session with inline confirm → /feedback | ✅ Done |
| FP-I03 | Restart with same config + inline confirm | ✅ Done |
| FP-I04 | Unified error toast (auto-dismiss, retry) | ✅ Done |
| FP-I05 | Fetch timeouts (STT 8s, TTS 10s, LLM 8s) | ✅ Done (hooks) |
| FP-I06 | Decode error handling (TTS) | ✅ Done (useAudioPlayer) |
| FP-J01–J07 | Feedback & Export | ⬜ Next |
| FP-K01–K08 | Admin Console | ⬜ Pending |
| FP-L01–L02 | Documentation | ⬜ Pending |

## Next step

**FP-J — Feedback & Export** (J01–J07): AI-generated coaching summary, key moments, session metadata, and .txt/.json export.

---

---

## Session 5 — 2026-04-28 (continued)

Work completed:
1. FP-J — Feedback & Export (J01–J06; J07 skipped as P2 stretch)
2. Pre-existing `tts.ts` `Buffer` type annotation fix

---

## 13. Pre-existing fix: tts.ts Buffer return annotation

**File:** `backend/src/routes/tts.ts`  
**Issue:** `pcmToWav` was annotated with return type `: Buffer` (i.e., `Buffer<ArrayBuffer>`). `Buffer.concat()` in newer `@types/node` returns `Buffer<ArrayBufferLike>` — the wider type — so the return statement failed the type check.  
**Fix:** Removed the explicit return type annotation; TypeScript now infers the correct `Buffer<ArrayBufferLike>` from `Buffer.concat`.

---

## 14. FP-J — Feedback & Export

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain J (FP-J01 – FP-J06)

FP-J07 (audio artifact download) is P2 / optional per spec — skipped.

### Files created

#### `backend/src/agents/coachingAgent.ts` (FP-J01)

Gemini-based coaching agent. Uses the same `gemini-2.5-flash` model as the persona agent.

Key design decisions:
- **Prompt format**: The transcript is formatted with turn indices and exact `[id:turnId]` markers so the model can reference turn IDs in `keyMoments.turnId` without hallucination.
- **JSON extraction**: `stripFences()` strips Markdown code fences before `JSON.parse`. This handles both direct JSON and fenced `\`\`\`json ... \`\`\`` responses.
- **Two-attempt retry**: If the first response fails to parse, a second attempt is made. On both failures, `makeFallback()` returns a static minimal `FeedbackResult` that still satisfies the schema (≥3 key moments, ≥1 "good", ≥1 "improvement").
- **Fallback uses real turn IDs**: The fallback key moments reference actual `userTurns[0..2].id` values from the submitted turns, so they match real turns in the transcript viewer.

#### `backend/src/routes/feedback.ts` (FP-J01)

`POST /api/feedback/generate`. Validates `turns`, `scenarioId`, `personaId`. Loads scenario and persona from JSON files (via re-exported `readScenarios`/`readPersonas` from `admin.ts`), calls `generateFeedback`, returns the result.

#### `frontend/src/components/feedback/FeedbackSummary.tsx` + `.module.css` (FP-J02)

- `overallAssessment`: paragraph in a card.
- `strengths` / `improvementAreas`: two-column grid — green titles/dots for strengths, amber for improvements.
- `coachingTips`: numbered ordered list beneath the grid.

#### `frontend/src/components/feedback/KeyMomentCard.tsx` + `.module.css` (FP-J03)

- Green/amber pill badge ("Good practice" / "Needs improvement") with matching colored left border.
- `label` (bold) + `explanation` (body text).
- Optional `turnText` prop shows a 3-line clamped blockquote of the referenced turn.

#### `frontend/src/components/feedback/TranscriptViewer.tsx` + `.module.css` (FP-J04)

- Scrollable container (`max-height: 480px; overflow-y: auto`), read-only.
- Turn bubbles: same user-left / persona-right layout as TranscriptPanel. `HH:MM:SS` or `MM:SS` elapsed timestamps.
- Key moment turns: bubble border and background overridden with green or amber; a pill inline badge ("✓ label" or "! label") appended inside the bubble.
- `data-turn-id` on each `<li>` for future scroll-to anchoring.

#### `frontend/src/components/feedback/ExportControls.tsx` + `.module.css` (FP-J06)

Three export buttons:
- **Copy**: `navigator.clipboard.writeText()` with 2s "✓ Copied!" visual state.
- **Download .txt**: Header + optional feedback assessment + `[MM:SS] Speaker: text` per turn. Triggered via `Blob + URL.createObjectURL + <a download>`.
- **Download .json**: Full `{ session, feedback }` object. Filename derived from scenario name slug.

### Files modified

#### `backend/src/index.ts`
- Imported `feedbackRouter` and registered at `/api/feedback`.

#### `frontend/src/pages/FeedbackPage.tsx`
Full rewrite of the stub. Calls `voiceApi.generateFeedback` on mount. Shows:
1. Metadata bar: scenario, persona, duration (mm:ss), completed turn count (FP-J05).
2. Export controls (always visible if turns exist).
3. Loading spinner or error banner while API call is in flight.
4. `<FeedbackSummary>` — overall assessment + strengths + improvements + tips.
5. Key Moments section — one `<KeyMomentCard>` per `feedback.keyMoments` entry, with matched turn text.
6. Full `<TranscriptViewer>` with key moment highlights.
- No-session guard: "No session found" message with dashboard link.

---

## Status after session 5

| FP | Description | Status |
|---|---|---|
| FP-A01–A06 | Infrastructure & Scaffold | ✅ Done |
| FP-B01–B05 | Learner Dashboard | ✅ Done |
| FP-C01–C06 | Voice Recording | ✅ Done |
| FP-D01–D03 | Session State Machine | ✅ Done |
| FP-E01–E03 | STT Pipeline | ✅ Done |
| FP-F01–F03 | LLM Persona Agent | ✅ Done |
| FP-F04 | Context window compression | ⚠️ Deferred |
| FP-G01–G04 | TTS Playback | ✅ Done |
| FP-H01–H03 | Transcript Panel | ✅ Done |
| FP-I01–I06 | Session Controls & Robustness | ✅ Done |
| FP-J01 | Backend coaching agent | ✅ Done |
| FP-J02 | Feedback summary (assessment + strengths + tips) | ✅ Done |
| FP-J03 | Key moments highlight (≥3, good + improvement) | ✅ Done |
| FP-J04 | Full transcript viewer (scrollable, highlighted) | ✅ Done |
| FP-J05 | Session metadata bar | ✅ Done |
| FP-J06 | Export .txt / .json + clipboard copy | ✅ Done |
| FP-J07 | Audio artifact download | ⬜ Skipped (P2, optional) |
| FP-K01–K08 | Admin Console | ⬜ Next |
| FP-L01–L02 | Documentation | ⬜ Pending |

## Next step

**FP-K — Admin Console** (K01–K08): Tabbed CRUD interface for scenarios and personas, live-reflected in the learner dashboard.

---

---

## Session 6 — 2026-04-28 (continued)

Work completed:
1. Multi-line SSE response bug fix
2. Model switcher (gear icon, all pages, all 4 API endpoints)
3. Gemini 3.1 Flash TTS audio decode fix
4. `maxOutputTokens` fix for Gemini 3 Flash
5. FP-K — Admin Console (full CRUD)
6. README overhaul (corrected API references from OpenAI/Anthropic → Gemini)

---

## 15. Multi-line SSE response bug fix

**Symptom:** AI persona responses spanning multiple lines were silently truncated to the first line.

**Root cause:** The old SSE parser split the raw byte stream on `\n` before buffering complete events. When TCP delivered a `data:` line's JSON payload across two reads, `JSON.parse` threw a `SyntaxError` on the first fragment; the catch block swallowed the error and skipped the line entirely — including the critical `done` event.

**Fix:** `frontend/src/hooks/useStreamingTranscript.ts`  
Rewrote the stream reader to maintain a `lineBuffer` string. Incoming decoded bytes are appended to the buffer; the buffer is then split on `\n\n` (SSE event boundaries). Only complete events are parsed — the last (potentially incomplete) slice remains in the buffer for the next read. This prevents all mid-line JSON parse failures.

Also added `TextDecoder` with `{ stream: true }` so multi-byte UTF-8 characters split across TCP reads are reassembled correctly.

---

## 16. Model Switcher

**Files created:**
- `frontend/src/hooks/useModelConfig.ts` — reads/writes `{ llmModel, ttsModel }` to `localStorage`. Exports `LLM_OPTIONS` and `TTS_OPTIONS` constant arrays.
- `frontend/src/components/dashboard/ModelSelector.tsx` — gear icon (⚙) fixed at top-right of viewport (`position: fixed`). Click toggles a popup panel. Click-outside closes it. Panel contains Chat model + Voice model dropdowns, a divider, and an Admin Console link. The gear turns orange when the panel is open.
- `frontend/src/components/dashboard/ModelSelector.module.css`

**Files modified:**
- `frontend/src/App.tsx` — `<ModelSelector />` mounted once at the root, outside `<Routes>`, so it persists across all pages.
- `frontend/src/hooks/useStreamingTranscript.ts` — `llmModelRef` tracks latest model; included in `openChatTurn` payload as `llmModel`.
- `frontend/src/hooks/useAudioPlayer.ts` — `ttsModelRef` tracks latest model; passed to `voiceApi.speak` as `ttsModel`.
- `frontend/src/pages/SessionPage.tsx` — `llmModelRef` passed to `voiceApi.transcribe` as `sttModel` form field.
- `frontend/src/pages/FeedbackPage.tsx` — `llmModel` from `useModelConfig` passed to `voiceApi.generateFeedback`.
- `frontend/src/services/voiceApi.ts` — `transcribe` accepts `sttModel?` (appended as FormData text field); `speak` accepts `ttsModel?`; `generateFeedback` passes `llmModel`.

**Backend wiring:**
- `backend/src/routes/audio.ts` — reads `req.body.sttModel`, creates Gemini model instance per-request (was module-level singleton).
- `backend/src/routes/chat.ts` — reads `llmModel` from body, passes to `streamTurn`.
- `backend/src/routes/tts.ts` — reads `ttsModel` from body, overrides `TTS_MODEL` constant.
- `backend/src/routes/feedback.ts` — reads `llmModel` from body, passes to `generateFeedback`.
- `backend/src/agents/personaAgent.ts` — accepts optional `modelName?` param; falls back to `GEMINI_MODEL` env var.
- `backend/src/agents/coachingAgent.ts` — same pattern.

**Model options confirmed against live API** (`GET /v1beta/models`):

| Label | API ID |
|---|---|
| Gemini 2.5 Flash | `gemini-2.5-flash` |
| Gemini 2.5 Flash Lite | `gemini-2.5-flash-lite` |
| Gemini 3 Flash | `gemini-3-flash-preview` |
| Gemini 3.1 Flash Lite | `gemini-3.1-flash-lite-preview` |
| 2.5 Flash TTS | `gemini-2.5-flash-preview-tts` |
| 3.1 Flash TTS | `gemini-3.1-flash-tts-preview` |

---

## 17. Gemini 3.1 Flash TTS audio decode fix

**Symptom:** `EncodingError: Unable to decode audio data` in `useAudioPlayer.ts` when using the 3.1 Flash TTS model.

**Root cause:** The backend PCM → WAV conversion checked `mimeType.startsWith('audio/L16')` (uppercase). Gemini 3.1 Flash TTS returns `audio/l16; rate=24000; channels=1` (lowercase). Case-sensitive `startsWith` missed the match, so raw PCM was sent directly to the browser, which cannot decode it.

**Fix:** `backend/src/routes/tts.ts`  
Changed check to `mimeType.toLowerCase().startsWith('audio/l16')`. Also case-insensitised the `rate=` regex to `/rate=(\d+)/i`.

---

## 18. maxOutputTokens fix for Gemini 3 Flash

**Symptom:** Gemini 3 Flash responses truncated after 2–4 words; `finishReason: MAX_TOKENS`.

**Root cause:** `personaAgent.ts` had `generationConfig: { maxOutputTokens: 200 }`. Gemini 3 Flash appeared to count tokens differently (or is more verbose by default) and hit the cap almost immediately.

**Fix:** `backend/src/agents/personaAgent.ts`  
Raised `maxOutputTokens` from `200` to `1000`. The system prompt already instructs the model to "Keep responses concise (1-3 sentences max)", so response length is controlled by the prompt, not the hard cap.

---

## 19. FP-K — Admin Console

**Spec reference:** `plan/2026-04-27_function-points_v1.md`, domain K (FP-K01 – FP-K08)

### Backend — `backend/src/routes/admin.ts` (full rewrite)

Added `writeScenarios` / `writePersonas` helpers using `fs/promises.writeFile`. Added full CRUD:

| Method | Route | Action |
|---|---|---|
| GET | `/api/admin/scenarios` | List all |
| POST | `/api/admin/scenarios` | Create (auto-generates `id`, `createdAt`, `updatedAt`) |
| PUT | `/api/admin/scenarios/:id` | Update (merges body, stamps `updatedAt`) |
| DELETE | `/api/admin/scenarios/:id` | Remove (404 if not found) |
| GET | `/api/admin/personas` | List all |
| POST | `/api/admin/personas` | Create |
| PUT | `/api/admin/personas/:id` | Update |
| DELETE | `/api/admin/personas/:id` | Remove |

Changes are written directly to `src/data/*.json` and are visible in the learner dashboard on next page load (no cache, no rebuild).

### Frontend

#### `frontend/src/components/admin/AdminModal.tsx` + `.module.css`

Reusable right-panel slide-in modal. Closes on Escape key or click-outside (`mousedown` on the overlay). `animation: slideIn` (translateX + fade, 0.16s).

#### `frontend/src/components/admin/ScenarioForm.tsx` + `.module.css`

Create/edit form for scenarios. Fields:
- Name (text), Description (textarea)
- Goals (textarea — one per line, split on save)
- Suggested Skill Focus (text)
- Compatible Personas (checkbox list from available personas)
- Scoring Weights — dynamic rows: category (text) + weight (number); running total shown in red when ≠ 100; validated before save
- Voice Behavior — Interrupt frequency (select), Speaking pace (select), Tone style (text)

#### `frontend/src/components/admin/PersonaForm.tsx` + `.module.css`

Create/edit form for personas. Fields:
- Name, Difficulty (select: easy/medium/hard)
- Traits (comma-separated, split on save)
- Voice (select: alloy/echo/fable/onyx/nova/shimmer)
- Behavior Notes (textarea)
- System Prompt (large textarea, 12 rows)

#### `frontend/src/pages/AdminPage.tsx` + `.module.css` (full rewrite of stub)

- Tab bar: **Scenarios** | **Personas** with live item count badges
- Each item: card with name, 2-line clamped description, metadata tags (goals count, persona count, tone/pace for scenarios; difficulty badge + trait pills + voice for personas)
- **Edit** — opens form modal pre-filled with item data
- **Delete** — inline confirmation ("Delete? Yes / No"); no browser `confirm()` dialogs
- After save or delete: re-fetches both lists via `load()` so the UI stays in sync

#### `frontend/src/pages/DashboardPage.tsx`

Removed "Admin Console →" link from the header — Admin Console is now accessible via the gear icon popup.

---

## Status after session 6

| FP | Description | Status |
|---|---|---|
| FP-A01–A06 | Infrastructure & Scaffold | ✅ Done |
| FP-B01–B05 | Learner Dashboard | ✅ Done |
| FP-C01–C06 | Voice Recording | ✅ Done |
| FP-D01–D03 | Session State Machine | ✅ Done |
| FP-E01–E03 | STT Pipeline | ✅ Done |
| FP-F01–F03 | LLM Persona Agent | ✅ Done |
| FP-F04 | Context window compression | ⚠️ Deferred (safe for demo-length sessions) |
| FP-G01–G04 | TTS Playback | ✅ Done |
| FP-H01–H03 | Transcript Panel | ✅ Done |
| FP-I01–I06 | Session Controls & Robustness | ✅ Done |
| FP-J01–J06 | Feedback & Export | ✅ Done |
| FP-J07 | Audio artifact download | ⬜ Skipped (P2, optional) |
| FP-K01–K08 | Admin Console | ✅ Done |
| FP-L01–L02 | Documentation | ✅ Done (README overhauled, changelog current) |
| — | Model Switcher (gear icon, all pages) | ✅ Done |
| — | SSE buffer parser (multi-line fix) | ✅ Done |
| — | PCM MIME case fix (3.1 Flash TTS) | ✅ Done |
| — | maxOutputTokens raised (Gemini 3 Flash) | ✅ Done |
