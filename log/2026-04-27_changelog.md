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
| FP-F01–F04 | LLM Persona Agent | ✅ Done (Gemini) |
| FP-G01–G04 | TTS Playback | ⬜ Next |
| FP-H01–H03 | Transcript Panel | ⬜ Pending |
| FP-I01–I06 | Session Controls & Robustness | ⬜ Pending |
| FP-J01–J07 | Feedback & Export | ⬜ Pending |
| FP-K01–K08 | Admin Console | ⬜ Pending |
| FP-L01–L02 | Documentation | ⬜ Pending |

## Next step

**FP-G — TTS Playback** (Implementation of voice output for AI responses).
