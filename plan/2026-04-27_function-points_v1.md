# AI Role Player — Function Point Breakdown
**Version:** v1  
**Date:** 2026-04-27  
**Status:** Ready for implementation

Each function point (FP) is a discrete, independently deliverable piece of functionality.  
Every FP maps to exact files it creates or modifies.

**Complexity:** S = half-day · M = 1 day · L = 1.5–2 days  
**Priority:** P0 = must-have for demo · P1 = required by spec · P2 = stretch

---

## Domain Map

```
A. Infrastructure & Scaffold        (FP-A01 – FP-A06)
B. Learner Dashboard                (FP-B01 – FP-B05)
C. Voice Recording                  (FP-C01 – FP-C06)
D. Session State Machine            (FP-D01 – FP-D03)
E. Voice Pipeline — STT             (FP-E01 – FP-E03)
F. Voice Pipeline — LLM Persona     (FP-F01 – FP-F04)
G. Voice Pipeline — TTS Playback    (FP-G01 – FP-G04)
H. Transcript Panel                 (FP-H01 – FP-H03)
I. Session Controls & Robustness    (FP-I01 – FP-I06)
J. Feedback & Export                (FP-J01 – FP-J07)
K. Admin Console                    (FP-K01 – FP-K08)
L. Deliverables — Documentation     (FP-L01 – FP-L02)
```

---

## A. Infrastructure & Scaffold

---

### FP-A01 — Frontend Project Scaffold
**Priority:** P0 · **Complexity:** S

**What it does:**  
Vite + React + TypeScript project initialized, ESLint + Prettier configured, Vite proxy to backend set up so `/api/*` routes forward to `localhost:3001`.

**Acceptance criteria:**
- `npm run dev` starts the dev server at `localhost:5173`
- `/api/health` proxies to backend and returns `{ ok: true }`
- TypeScript strict mode enabled, no type errors on empty scaffold

**Research note:**  
No specific lesson — baseline to build on.

**Files created:**
```
frontend/
├── package.json
├── vite.config.ts              ← proxy /api → localhost:3001
├── tsconfig.json
├── index.html
├── .eslintrc.cjs
├── .prettierrc
└── src/
    ├── main.tsx
    ├── App.tsx
    └── vite-env.d.ts
```

**Depends on:** nothing

---

### FP-A02 — Backend Project Scaffold
**Priority:** P0 · **Complexity:** S

**What it does:**  
Express server with TypeScript (`tsx` for execution), CORS enabled, `.env` loaded, global error handler middleware, health check route.

**Acceptance criteria:**
- `npm run dev` starts server at `localhost:3001`
- `GET /api/health` returns `{ ok: true, timestamp }`
- Unhandled errors return `{ error: string }` with appropriate HTTP status

**Files created:**
```
backend/
├── package.json
├── tsconfig.json
├── .env.example                ← ANTHROPIC_API_KEY, OPENAI_API_KEY
└── src/
    ├── index.ts                ← Express app, listen()
    ├── routes/
    │   └── health.ts
    └── middleware/
        └── errorHandler.ts
```

**Depends on:** nothing

---

### FP-A03 — React Router Setup & Page Stubs
**Priority:** P0 · **Complexity:** S

**What it does:**  
Client-side routes wired. Each page renders a placeholder `<h1>` so navigation works immediately.

**Routes:**
- `/` → DashboardPage
- `/session` → SessionPage
- `/feedback` → FeedbackPage
- `/admin` → AdminPage

**Acceptance criteria:**
- Navigating to each route renders the correct page without a 404
- Back-button works between pages

**Files created:**
```
frontend/src/
├── App.tsx                     ← BrowserRouter + route definitions
└── pages/
    ├── DashboardPage.tsx
    ├── SessionPage.tsx
    ├── FeedbackPage.tsx
    └── AdminPage.tsx
```

**Depends on:** FP-A01

---

### FP-A04 — Shared TypeScript Types
**Priority:** P0 · **Complexity:** S

**What it does:**  
Single source of truth for all shared interfaces: `Scenario`, `Persona`, `Session`, `Turn`, `SessionState`, `FeedbackResult`. Both frontend and backend reference these (or duplicated in backend with matching shape).

**Acceptance criteria:**
- All types are exported from one file; no inline `any` anywhere in the codebase
- `SessionState` is a discriminated union: `"idle" | "listening" | "processing" | "speaking" | "paused" | "ended"`

**Files created:**
```
frontend/src/
└── types/
    └── index.ts                ← all shared interfaces

backend/src/
└── types/
    └── index.ts                ← same shapes (or import shared pkg if monorepo)
```

**Depends on:** FP-A01, FP-A02

---

### FP-A05 — Seed Data (Scenarios + Personas JSON)
**Priority:** P0 · **Complexity:** S

**What it does:**  
Three realistic sales scenarios and four personas seeded into JSON files. These drive both the dashboard dropdowns and the LLM persona prompts.

**Acceptance criteria:**
- 3 scenarios: e.g., "Price Objection", "Upsell Opportunity", "Renewal Conversation"
- 4 personas: e.g., "Skeptical Sam", "Rushed Rachel", "Detail-Oriented David", "Friendly Indecisive Fiona"
- Each persona has a `systemPrompt` string ready for LLM injection
- Each scenario has `compatiblePersonaIds`, `goals[]`, `scoringWeights[]`, `voiceBehavior`

**Research note (Lesson 6):**  
Persona system prompts must include structured conversation phase guidance: `Opening → Discovery → Pitch → Objection Handling → Closing`. This is what Retell AI uses to cut hallucinations.

**Files created:**
```
backend/src/data/
├── scenarios.json
└── personas.json
```

**Depends on:** FP-A04

---

### FP-A06 — API Service Layer (Frontend)
**Priority:** P0 · **Complexity:** S

**What it does:**  
Thin typed wrapper around `fetch` for all backend calls. Centralizes base URL, error handling, and JSON parsing. Admin calls and voice pipeline calls live in separate files.

**Acceptance criteria:**
- All API calls go through this layer; no raw `fetch` in components
- Network errors throw a typed `ApiError` with `status` and `message`
- All functions are typed with request/response generics

**Files created:**
```
frontend/src/services/
├── api.ts                      ← base fetch wrapper, ApiError class
├── voiceApi.ts                 ← transcribe(), chatTurn(), speak()
└── adminApi.ts                 ← getScenarios(), getPersonas(), CRUD ops
```

**Depends on:** FP-A04

---

## B. Learner Dashboard

---

### FP-B01 — Scenario & Persona Data Endpoints
**Priority:** P0 · **Complexity:** S

**What it does:**  
`GET /api/admin/scenarios` and `GET /api/admin/personas` read from JSON files and return the full list. Used by both the dashboard and admin console.

**Acceptance criteria:**
- Returns 200 with array even if JSON file is empty
- Response is typed to match `Scenario[]` and `Persona[]`

**Files created / modified:**
```
backend/src/
├── routes/
│   └── admin.ts                ← GET /scenarios, GET /personas (+ CRUD added in FP-K)
└── data/
    ├── scenarios.json          ← created in FP-A05
    └── personas.json
```

**Depends on:** FP-A02, FP-A05

---

### FP-B02 — Searchable Scenario Selector
**Priority:** P0 · **Complexity:** S

**What it does:**  
Dropdown that fetches scenarios from the API on mount. Supports keyboard search/filter. Selecting a scenario updates dashboard state.

**Acceptance criteria:**
- Typing filters the list in real time (client-side filter, no extra API call)
- Selecting a scenario stores it in local component state and enables the persona selector
- Empty state: "No scenarios found — ask your admin to create one"

**Files created / modified:**
```
frontend/src/
├── components/dashboard/
│   └── ScenarioSelector.tsx
└── pages/
    └── DashboardPage.tsx       ← holds selected scenario state
```

**Depends on:** FP-A06, FP-B01

---

### FP-B03 — Searchable Persona Selector (Filtered by Scenario)
**Priority:** P0 · **Complexity:** S

**What it does:**  
Dropdown that shows only personas compatible with the selected scenario (`compatiblePersonaIds`). Disabled until a scenario is selected.

**Acceptance criteria:**
- Persona list filtered to `scenario.compatiblePersonaIds`; full list shown if scenario has no restrictions
- Disabled + tooltip "Select a scenario first" when no scenario chosen
- Selecting a persona updates dashboard state

**Files created / modified:**
```
frontend/src/
└── components/dashboard/
    └── PersonaSelector.tsx
```

**Depends on:** FP-B02

---

### FP-B04 — Difficulty Selector + Session Summary Card
**Priority:** P0 · **Complexity:** S

**What it does:**  
Three-option difficulty selector (Easy / Medium / Hard). Below it, a summary card renders the selected scenario's goals, persona traits, and suggested skill focus. Updates reactively as selections change.

**Acceptance criteria:**
- Summary card is empty/placeholder until both scenario and persona are selected
- Difficulty defaults to "Medium"
- All three fields visible: scenario goals list, persona traits chips, skill focus text

**Files created / modified:**
```
frontend/src/
└── components/dashboard/
    ├── DifficultySelector.tsx
    └── SessionSummaryCard.tsx
```

**Depends on:** FP-B02, FP-B03

---

### FP-B05 — "Start Role Play" Button + Navigation
**Priority:** P0 · **Complexity:** S

**What it does:**  
Single primary CTA. Disabled until scenario + persona are selected. On click, stores session config in Context and navigates to `/session`.

**Acceptance criteria:**
- Button disabled (greyed, `aria-disabled`) when selections incomplete
- On click: writes `{ scenario, persona, difficulty }` to SessionContext, then `navigate('/session')`
- Session page must be able to read config from context immediately on mount

**Research note (Lesson 7):**  
On first session only, show a brief onboarding overlay before navigating — sets latency expectations ("AI may take 1–2 seconds to respond; you can interrupt at any time").

**Files created / modified:**
```
frontend/src/
├── pages/
│   └── DashboardPage.tsx       ← Start button + first-run onboarding logic
├── components/dashboard/
│   └── OnboardingOverlay.tsx   ← shown on first session (localStorage flag)
└── context/
    └── SessionContext.tsx      ← created here, holds session config
```

**Depends on:** FP-B02, FP-B03, FP-B04, FP-D01

---

## C. Voice Recording

---

### FP-C01 — Microphone Permission Request & Denial Handler
**Priority:** P0 · **Complexity:** S

**What it does:**  
Calls `navigator.mediaDevices.getUserMedia({ audio: true })` on session start. If denied, renders a guidance component with browser-specific recovery steps instead of the voice panel.

**Acceptance criteria:**
- Permission prompt triggers on session page mount (not dashboard)
- On denial: `MicPermissionGuide` shown with steps for Chrome / Firefox / Safari
- On grant: `MediaStream` stored in hook state, voice panel rendered
- Re-check permission if user clicks "Try again"

**Research note (Lesson 8):**  
Every state must have both audio and visual equivalents. Permission guide must be clear and actionable — not a generic error message.

**Files created:**
```
frontend/src/
├── hooks/
│   └── useVoiceRecorder.ts     ← getUserMedia, permission state
└── components/session/
    └── MicPermissionGuide.tsx  ← browser-specific recovery instructions
```

**Depends on:** FP-A01

---

### FP-C02 — Push-to-Talk (PTT) Mode
**Priority:** P0 · **Complexity:** S

**What it does:**  
Hold mic button to record; release to submit. `mousedown`/`touchstart` starts `MediaRecorder`, `mouseup`/`touchend` stops it and emits the audio blob.

**Acceptance criteria:**
- Recording starts within 50ms of button press
- Recording stops and blob emitted within 50ms of button release
- Accidental short taps (<200ms) are discarded with a toast: "Hold to record"
- Works on both mouse and touch events

**Research note (Lesson 4):**  
PTT is the right default for sales training — learners are nervous and need intentional control. Hands-free auto-detect added in FP-C03 as an option, not the default.

**Files created / modified:**
```
frontend/src/
├── hooks/
│   └── useVoiceRecorder.ts     ← PTT logic: onPress/onRelease handlers
└── components/session/
    └── VoicePanel.tsx          ← mic button with mousedown/touchstart events
```

**Depends on:** FP-C01

---

### FP-C03 — Tap-to-Record (Toggle) Mode
**Priority:** P1 · **Complexity:** S

**What it does:**  
Single tap starts recording; another tap stops and submits. A mode toggle switch on the session page lets the user switch between PTT and tap-to-record.

**Acceptance criteria:**
- Toggle switch persists user's choice in `localStorage`
- Button label/icon clearly indicates current state ("Tap to start" vs "Tap to stop")
- Auto-submit on toggle-off (same as PTT release)

**Files created / modified:**
```
frontend/src/
├── hooks/
│   └── useVoiceRecorder.ts     ← toggle mode branch
└── components/session/
    └── VoicePanel.tsx          ← mode toggle switch UI
```

**Depends on:** FP-C02

---

### FP-C04 — Live Waveform / Input Level Meter
**Priority:** P1 · **Complexity:** M

**What it does:**  
While recording, an animated waveform (or level bars) reacts to the user's voice amplitude in real time using `AnalyserNode` from the Web Audio API. Updates at 60fps via `requestAnimationFrame`.

**Acceptance criteria:**
- Waveform visible and reacting within one animation frame of recording start
- Waveform stops animating when recording stops
- Renders on a `<canvas>` element; no external library required (can use wavesurfer.js if simpler)
- Minimum viable: 5-bar level meter; preferred: smooth waveform line

**Research note (Lesson 2):**  
This is the most important "alive" signal to the user — static mic icon = "is this working?". The waveform reacting to their voice is instant feedback that the system is listening. ChatGPT's static indicator was a top complaint.

**Files created / modified:**
```
frontend/src/
├── hooks/
│   └── useVoiceRecorder.ts     ← AnalyserNode setup, getByteTimeDomainData
└── components/session/
    └── WaveformCanvas.tsx      ← canvas + requestAnimationFrame draw loop
```

**Depends on:** FP-C01

---

### FP-C05 — Recording Timer
**Priority:** P1 · **Complexity:** S

**What it does:**  
Elapsed timer (mm:ss) displayed while recording. Automatically stops recording and submits at 30-second cap (prevents runaway recordings and keeps STT latency predictable).

**Acceptance criteria:**
- Timer starts at 00:00 on recording start, increments every second
- At 30s: recording auto-stops, blob emitted, toast "Max recording length reached"
- Timer resets on each new recording

**Files created / modified:**
```
frontend/src/
└── components/session/
    └── VoicePanel.tsx          ← timer display integrated with recording state
```

**Depends on:** FP-C02

---

### FP-C06 — Cancel Recording
**Priority:** P1 · **Complexity:** S

**What it does:**  
"Cancel" button (or swipe gesture on mobile) visible while recording. Discards the current recording without submitting; returns to Listening state.

**Acceptance criteria:**
- Cancel button visible only during recording state
- Cancelling does NOT trigger STT or LLM calls
- Session state returns to `listening` immediately
- Keyboard: `Escape` key cancels

**Files created / modified:**
```
frontend/src/
├── hooks/
│   └── useVoiceRecorder.ts     ← cancel() method: MediaRecorder.stop() without emitting blob
└── components/session/
    └── VoicePanel.tsx          ← Cancel button + Escape key handler
```

**Depends on:** FP-C02

---

## D. Session State Machine

---

### FP-D01 — SessionContext + useReducer State Machine
**Priority:** P0 · **Complexity:** M

**What it does:**  
React Context with a `useReducer` managing the full session lifecycle. All state transitions go through dispatch actions. Components read state from context; they never mutate it directly.

**States:** `idle → listening → processing → speaking → paused → ended`

**Actions:** `START_SESSION`, `START_RECORDING`, `STOP_RECORDING`, `FIRST_AUDIO_CHUNK`, `AUDIO_COMPLETE`, `SKIP_AI`, `PAUSE_SESSION`, `RESUME_SESSION`, `END_SESSION`, `ERROR`, `RESET`

**Acceptance criteria:**
- Illegal transitions are no-ops (e.g., `PAUSE` while `processing` does nothing)
- `session.turns[]` is append-only; each turn has `{ id, speaker, text, timestamp, partial? }`
- Context provides `dispatch`, `session`, `state` to all children

**Research note (Lesson 2):**  
The state machine is the source of truth for every visual indicator. Any time state changes, the indicator must update synchronously — no setTimeout hacks.

**Files created:**
```
frontend/src/
└── context/
    └── SessionContext.tsx      ← createContext, Provider, reducer, action types
```

**Depends on:** FP-A04

---

### FP-D02 — Session State Visual Indicator
**Priority:** P0 · **Complexity:** S

**What it does:**  
Always-visible pill/badge that shows the current session state with color, animation, and text label. Derived purely from `SessionContext.state`.

| State | Color | Animation | Label |
|---|---|---|---|
| `idle` | grey | static | Ready |
| `listening` | red | pulse | Listening… |
| `processing` | amber | spinner | Processing… |
| `speaking` | blue | wave | Speaking… |
| `paused` | orange | static | Paused |
| `ended` | green | static | Session Ended |

**Acceptance criteria:**
- State change reflects in the indicator within one render cycle (synchronous)
- `aria-live="polite"` so screen readers announce state changes
- Text label always visible alongside animation (not animation-only)

**Research note (Lesson 2):**  
Never rely on animation alone. State text is the accessibility fallback. Siri always plays a sound; we add visual text as our equivalent.

**Files created:**
```
frontend/src/
└── components/session/
    └── SessionStateIndicator.tsx
```

**Depends on:** FP-D01

---

### FP-D03 — Audio Earcons (State Transition Sounds)
**Priority:** P1 · **Complexity:** S

**What it does:**  
Short, distinct audio tones (earcons) play on key state transitions. Implemented with the Web Audio API oscillator (no audio files needed — pure synthesis).

| Transition | Sound |
|---|---|
| `idle → listening` | soft rising tone (300ms) |
| `listening → processing` | neutral click (50ms) |
| `processing → speaking` | gentle chime (200ms) |
| `speaking → listening` | soft descending tone (300ms) |

**Acceptance criteria:**
- Earcons respect the user's mute/volume setting from FP-G02
- No earcon plays when user has muted AI output
- Earcons fire via `AudioContext.createOscillator()` — no network requests

**Research note (Lesson 1 + Siri lesson):**  
Siri always gives audible confirmation — users who know a transition happened tolerate the subsequent wait better. These tiny tones reduce perceived latency significantly.

**Files created:**
```
frontend/src/
└── hooks/
    └── useEarcons.ts           ← createOscillator, playTone(freq, duration)
```

**Depends on:** FP-D01, FP-G02

---

## E. Voice Pipeline — STT (Speech-to-Text)

---

### FP-E01 — Backend: POST /api/audio/transcribe
**Priority:** P0 · **Complexity:** M

**What it does:**  
Receives audio blob (`multipart/form-data`), forwards to OpenAI Whisper API (`whisper-1`), returns transcript text. Handles Whisper errors gracefully.

**Acceptance criteria:**
- Accepts `audio/webm`, `audio/mp4`, `audio/wav` MIME types
- Returns `{ text: string, confidence?: number }` on success
- Returns `{ error: "transcription_failed", message: string }` on Whisper error
- Times out after 10s; returns `{ error: "timeout" }` if Whisper doesn't respond

**Files created / modified:**
```
backend/src/
└── routes/
    └── audio.ts                ← POST /api/audio/transcribe, multer middleware
```

**Depends on:** FP-A02, FP-A04

---

### FP-E02 — Frontend: Send Audio Blob → Get Transcript
**Priority:** P0 · **Complexity:** S

**What it does:**  
After recording stops, `voiceApi.transcribe(blob)` is called. The `processing` state is set **before** the API call (within 300ms of recording stop). Transcript result is dispatched into session turns.

**Acceptance criteria:**
- `dispatch(STOP_RECORDING)` → state becomes `processing` synchronously, then API call fires
- On success: dispatch `ADD_TURN({ speaker: 'user', text })`, then trigger LLM call (FP-F02)
- On failure: dispatch `ERROR` with message; session stays in `processing` waiting for retry

**Research note (Lesson 1):**  
The 300ms rule: the UI state flip to "processing" must happen on `onRecordStop` before any async call. This is a pure synchronous dispatch.

**Files created / modified:**
```
frontend/src/
├── services/
│   └── voiceApi.ts             ← transcribe(blob): FormData upload
└── pages/
    └── SessionPage.tsx         ← orchestrates: onRecordStop → dispatch → transcribe → chatTurn
```

**Depends on:** FP-C02, FP-D01, FP-E01

---

### FP-E03 — STT Failure Recovery
**Priority:** P1 · **Complexity:** S

**What it does:**  
If transcription fails (network error, Whisper timeout, empty result), the user is given clear options: retry recording, or type their message manually (text input escape hatch).

**Acceptance criteria:**
- After 1 failed transcription: toast "Transcription failed — tap to retry"
- After 2 consecutive failures: show text input field as fallback
- Text input submission follows the same path as successful STT (dispatch user turn → LLM)
- Error messaging never says "you" failed; always "something went wrong"

**Research note (Lesson 5):**  
"After 2 consecutive STT failures → offer to switch to text input as escape hatch." Own the failure, don't blame the user.

**Files created / modified:**
```
frontend/src/
└── components/session/
    └── SttFallbackInput.tsx    ← text input shown after repeated STT failures
```

**Depends on:** FP-E02, FP-D01

---

## F. Voice Pipeline — LLM Persona Agent

---

### FP-F01 — Persona Agent: System Prompt Construction
**Priority:** P0 · **Complexity:** M

**What it does:**  
Builds the LLM system prompt by combining: persona's `systemPrompt`, scenario context (goals, scoring weights, voice behavior), difficulty modifier, and structured conversation phase instructions.

**Prompt structure:**
```
[PERSONA IDENTITY]
[SCENARIO CONTEXT]
[CONVERSATION PHASE GUIDE: Opening → Discovery → Pitch → Objection → Closing]
[DIFFICULTY MODIFIER: e.g., "Be more resistant at Hard difficulty"]
[FILLER INSTRUCTION: "When thinking, say 'Let me think about that...' or 'Interesting point...'"]
[FORMAT: Respond in 1-3 sentences max. Never break character.]
```

**Acceptance criteria:**
- Prompt generated server-side; never exposed to the frontend client
- Filler phrase instruction included so AI responds immediately with something (reduces perceived latency)
- Structured phase guide prevents derailing to off-topic conversations

**Research note (Lesson 6):**  
Structured phases beat free-form prompts — Retell AI's competitive edge. Filler phrases are Lesson 1's key tactic for perceived latency.

**Files created:**
```
backend/src/
└── agents/
    └── personaAgent.ts         ← buildSystemPrompt(persona, scenario, difficulty), streamTurn()
```

**Depends on:** FP-A04, FP-A05

---

### FP-F02 — Backend: POST /api/chat/turn (SSE Streaming)
**Priority:** P0 · **Complexity:** M

**What it does:**  
Receives conversation history + user's latest turn, calls Claude via `anthropic.messages.stream()`, streams tokens back as Server-Sent Events. Frontend receives each token and appends to transcript in real time.

**Request:**
```json
{
  "personaId": "...",
  "scenarioId": "...",
  "difficulty": "medium",
  "history": [{ "role": "user|assistant", "content": "..." }],
  "userText": "..."
}
```

**SSE events:**
```
data: {"type":"delta","text":"Let me"}
data: {"type":"delta","text":" think"}
data: {"type":"done","fullText":"Let me think about that..."}
data: {"type":"error","message":"..."}
```

**Acceptance criteria:**
- First SSE token arrives within 800ms of request (best effort with Claude API)
- `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- `done` event includes the full assembled text for TTS
- Connection closed cleanly on stream complete or error

**Files created / modified:**
```
backend/src/
├── routes/
│   └── chat.ts                 ← POST /api/chat/turn, SSE response
└── agents/
    └── personaAgent.ts         ← streamTurn(prompt, history): AsyncIterable
```

**Depends on:** FP-A02, FP-F01

---

### FP-F03 — Frontend: Consume SSE → Live Transcript
**Priority:** P0 · **Complexity:** M

**What it does:**  
`useStreamingTranscript` hook opens an SSE connection to `/api/chat/turn`, reads token deltas, and appends them to the current persona turn in `SessionContext`. The transcript panel shows the AI typing in real time.

**Acceptance criteria:**
- Partial persona turn visible in transcript as tokens arrive (marked `partial: true`)
- On `done` event: turn marked `partial: false`, TTS triggered with `fullText`
- On `error` event: turn shows "[Response error]", session dispatches `ERROR`
- **Empty response guard:** if `fullText.trim() === ""` after stream completes → treat as error, dispatch `ERROR` with "Empty response received" (covers req 1.2.7.1 malformed payload case)
- **Malformed SSE payload guard:** if a `data:` line is not valid JSON → skip that chunk, log warning; do not crash
- Hook cleans up EventSource on unmount

**Files created:**
```
frontend/src/
└── hooks/
    └── useStreamingTranscript.ts   ← EventSource, onmessage, dispatch ADD_TURN / UPDATE_TURN
```

**Depends on:** FP-D01, FP-F02

---

### FP-F04 — Context Window Management (Long Sessions)
**Priority:** P1 · **Complexity:** S

**What it does:**  
After 10 turns, older turns are summarized into a single context message to prevent token limit overflow. Last 5 full turns always kept verbatim.

**Acceptance criteria:**
- Backend `buildHistory()` function checks total token estimate; if >6000 tokens, compresses older turns
- Summary message: "Earlier in the conversation: [1-paragraph summary of key points]"
- No visible change to user; transcript panel always shows full history

**Files created / modified:**
```
backend/src/
└── agents/
    └── personaAgent.ts         ← buildHistory(turns): condensed history array
```

**Depends on:** FP-F01

---

## G. Voice Pipeline — TTS & Audio Playback

---

### FP-G01 — Backend: POST /api/tts/speak (Chunked Audio Stream)
**Priority:** P0 · **Complexity:** M

**What it does:**  
Receives text, calls OpenAI TTS API (`tts-1`, voice matched to persona), pipes the audio response as chunked binary back to the frontend. First chunk sent as soon as OpenAI starts responding.

**Key optimization:** Only the first 1–2 sentences are sent in the initial TTS call, so audio starts playing while the rest is still generating. The `done` SSE event from FP-F02 triggers this with the first sentence extracted.

**Acceptance criteria:**
- `Content-Type: audio/mpeg`, `Transfer-Encoding: chunked`
- First audio byte reaches frontend within 800ms (best effort)
- Voice configurable per persona (OpenAI voices: alloy, echo, fable, onyx, nova, shimmer)
- Returns `{ error: "tts_failed" }` JSON if TTS API fails (not a binary stream)

**Files created:**
```
backend/src/
└── routes/
    └── tts.ts                  ← POST /api/tts/speak, pipe OpenAI TTS stream
```

**Depends on:** FP-A02

---

### FP-G02 — Frontend: Audio Playback Hook (Chunked Streaming)
**Priority:** P0 · **Complexity:** L

**What it does:**  
`useAudioPlayer` hook fetches the TTS audio stream, decodes chunks with `AudioContext.decodeAudioData()`, and starts playback as soon as the first decodable chunk arrives. Subsequent chunks are queued and played seamlessly.

**Acceptance criteria:**
- Playback begins within 2.5s of recording stop (end-to-end: STT + LLM first token + TTS first chunk)
- No gap between consecutive audio chunks (gapless playback via `AudioBufferSourceNode` scheduling)
- On playback complete: dispatch `AUDIO_COMPLETE` → session state → `listening`
- Exposes `stop()`, `setVolume(v)`, `mute()`, `unmute()` imperative handles

**Research note (Lesson 3 — Interruption):**  
`stop()` must respond within 200ms. Implemented by calling `AudioBufferSourceNode.stop()` immediately, no fade required.

**Files created:**
```
frontend/src/
└── hooks/
    └── useAudioPlayer.ts       ← fetch stream, decode chunks, AudioBufferSourceNode queue
```

**Depends on:** FP-G01, FP-D01

---

### FP-G03 — Playback Controls (Mute, Volume, Stop/Skip)
**Priority:** P1 · **Complexity:** S

**What it does:**  
UI controls wired to `useAudioPlayer` handles. Visible only when session state is `speaking`.

**Acceptance criteria:**
- Mute/unmute: toggles `GainNode.gain.value` between 0 and current volume
- Volume slider: 0–100%, adjusts `GainNode.gain.value` in real time
- Stop/skip: calls `stop()` on `useAudioPlayer`, dispatches `SKIP_AI`, state returns to `listening`
- Volume preference persisted in `localStorage`

**Files created:**
```
frontend/src/
└── components/session/
    └── PlaybackControls.tsx    ← mute button, volume slider, stop/skip button
```

**Depends on:** FP-G02, FP-D01

---

### FP-G04 — Real Interruption (User Speaks While AI Is Speaking)
**Priority:** P1 · **Complexity:** M

**What it does:**  
If the user starts speaking (PTT press or voice activity detected) while the AI is playing audio, playback stops immediately and recording begins. A 400ms hold timer prevents backchannels ("mm-hmm") from triggering interruption.

**Acceptance criteria:**
- PTT press during `speaking` state: `stop()` called within 200ms, state transitions to `listening`, recording starts
- Tap-to-record during `speaking`: first tap stops AI, second tap starts recording (two-tap model)
- Backchannel guard: voice activity must be sustained ≥400ms before triggering interruption in hands-free mode

**Research note (Lesson 3):**  
"Users must be able to cut the AI off mid-sentence — this is where ChatGPT fails and Gemini succeeds." Basic VAD is not enough; 400ms hold timer prevents false triggers from "yeah", "mm-hmm".

**Files created / modified:**
```
frontend/src/
├── hooks/
│   ├── useVoiceRecorder.ts     ← detect sustained voice activity for hands-free interrupt
│   └── useAudioPlayer.ts       ← expose stop() called on interrupt
└── pages/
    └── SessionPage.tsx         ← wires PTT press → stop playback → start recording
```

**Depends on:** FP-C02, FP-G02, FP-D01

---

## H. Transcript Panel

---

### FP-H01 — Real-Time Streaming Transcript Panel
**Priority:** P0 · **Complexity:** M

**What it does:**  
Scrollable panel showing all turns in chronological order. User turns left-aligned; persona turns right-aligned (or color-distinguished). Partial turns (streaming) show a cursor/blink indicator.

**Acceptance criteria:**
- Auto-scrolls to bottom as new content arrives
- User can manually scroll up to read history without auto-scroll fighting them (pause auto-scroll on manual scroll, resume on scroll-to-bottom)
- Partial turns show blinking cursor at end of text
- Timestamps (HH:MM:SS) on each turn

**Files created:**
```
frontend/src/
└── components/session/
    └── TranscriptPanel.tsx     ← turn list, auto-scroll logic, partial indicator
```

**Depends on:** FP-D01, FP-F03

---

### FP-H02 — Live AI Captions (What AI Is Saying)
**Priority:** P1 · **Complexity:** S

**What it does:**  
While AI audio is playing, the current sentence being spoken is highlighted in the transcript. As audio progresses, highlight advances through sentences.

**Acceptance criteria:**
- Highlighted sentence visible in transcript during `speaking` state
- Highlight advances approximately in sync with audio (word-level sync not required; sentence-level sufficient)
- Removes highlight when audio complete

**Research note (Lesson 8):**  
"Live captions of AI's speech — show what the AI is saying in text simultaneously." This is the accessibility requirement and also helps learners follow along in noisy environments.

**Files created / modified:**
```
frontend/src/
└── components/session/
    └── TranscriptPanel.tsx     ← add `activeTurnId` prop, highlight current speaking turn
```

**Depends on:** FP-H01, FP-G02

---

### FP-H03 — Transcript Scroll Memory
**Priority:** P2 · **Complexity:** S

**What it does:**  
If the user has scrolled up to read history, auto-scroll pauses. A "Jump to latest" button appears. Clicking it resumes auto-scroll. Auto-scroll also resumes automatically when the user scrolls back to the bottom.

**Acceptance criteria:**
- "Jump to latest" button appears when user scrolls up > 100px from bottom
- Button click scrolls smoothly to bottom and resumes auto-scroll
- No jarring scroll jumps while user is reading

**Files created / modified:**
```
frontend/src/
└── components/session/
    └── TranscriptPanel.tsx     ← scroll position tracking, JumpToLatest button
```

**Depends on:** FP-H01

---

## I. Session Controls & Robustness

---

### FP-I01 — Pause & Resume Session
**Priority:** P1 · **Complexity:** S

**What it does:**  
Pause halts mic recording and AI audio playback. Resume restores the previous state. A pause banner is shown during paused state.

**Acceptance criteria:**
- Pause during `listening`: stops mic, audio paused (if any)
- Pause during `speaking`: stops audio playback at current position (resumes from start, not mid-sentence)
- Resume: returns to `listening` state
- Keyboard shortcut: `Space` to toggle pause/resume

**Files created / modified:**
```
frontend/src/
└── components/session/
    └── SessionControls.tsx     ← Pause/Resume/End/Restart buttons
```

**Depends on:** FP-D01, FP-C02, FP-G02

---

### FP-I02 — End Session & Navigate to Feedback
**Priority:** P0 · **Complexity:** S

**What it does:**  
"End Session" button (with confirmation dialog) stops all audio/recording, marks session state as `ended`, stores the completed session in context, and navigates to `/feedback`.

**Acceptance criteria:**
- Confirmation dialog: "End session? You'll be taken to your feedback summary." [Continue] [Cancel]
- On confirm: stop recording + playback, dispatch `END_SESSION`, navigate to `/feedback`
- Session data (turns, scenario, persona, duration) preserved in context for feedback page

**Files created / modified:**
```
frontend/src/
├── components/session/
│   └── SessionControls.tsx     ← End button + confirmation dialog
└── pages/
    └── SessionPage.tsx         ← navigate('/feedback') on END_SESSION
```

**Depends on:** FP-D01, FP-I01

---

### FP-I03 — Restart Session
**Priority:** P1 · **Complexity:** S

**What it does:**  
"Restart" resets all session state (turns, state machine) and begins a fresh session with the same scenario/persona/difficulty. No re-selection required.

**Acceptance criteria:**
- Confirmation dialog before restart ("All progress will be lost")
- Session turns cleared, state reset to `idle` → immediately transitions to `listening`
- No page navigation; restart happens in-place

**Files created / modified:**
```
frontend/src/
└── components/session/
    └── SessionControls.tsx     ← Restart button + dispatch RESET
```

**Depends on:** FP-D01

---

### FP-I04 — Service Error Handling & Retry
**Priority:** P1 · **Complexity:** M

**What it does:**  
All three API calls (STT, LLM, TTS) have retry logic: silent retry once on transient errors, then surface a user-facing message with a manual retry option.

**Retry policy:**
- Attempt 1: immediate
- Attempt 2 (silent): 1s delay
- Attempt 3: show error toast with "Retry" button

**Acceptance criteria:**
- Network errors (fetch failed) → silent retry → if still failing → toast "Connection issue, please retry"
- LLM error (Claude API 500) → retry with same history → if still failing → "AI response failed, try again"
- TTS error → skip audio, show transcript text only, toast "Audio unavailable for this response"
- Session never hard-crashes; always recoverable

**Research note (Lesson 5):**  
Silent retry on transient failures before surfacing to user. Error messages own the failure — never blame the user.

**Files created / modified:**
```
frontend/src/
├── services/
│   └── api.ts                  ← retryFetch(url, options, maxRetries) helper
└── components/session/
    └── ErrorToast.tsx          ← dismissible toast with optional Retry callback
```

**Depends on:** FP-A06, FP-D01

---

### FP-I05 — Timeout Handling
**Priority:** P1 · **Complexity:** S

**What it does:**  
If the LLM hasn't produced a first token within 8s, or the TTS hasn't started within 10s, show a timeout message and offer retry.

**Acceptance criteria:**
- LLM timeout (8s): "Taking longer than expected… [Retry]" — session stays in `processing`
- TTS timeout (10s): fall back to text-only mode, show toast "Audio unavailable"
- Both timeouts are implemented via `AbortController` + `setTimeout`

**Files created / modified:**
```
frontend/src/
└── hooks/
    └── useStreamingTranscript.ts   ← AbortController with 8s timeout
```

**Depends on:** FP-F03, FP-G02

---

### FP-I06 — Audio Codec Failure Handling
**Priority:** P1 · **Complexity:** S

**What it does:**  
If `AudioContext.decodeAudioData()` throws (unsupported codec, corrupted chunk), the current turn falls back to text-only display. A non-blocking toast explains the situation.

**Acceptance criteria:**
- `decodeAudioData` error → catch → show turn text only → toast "Audio playback failed for this response"
- Session continues normally from `listening` state
- No crash or frozen UI

**Files created / modified:**
```
frontend/src/
└── hooks/
    └── useAudioPlayer.ts       ← try/catch around decodeAudioData, emit 'decode_error' event
```

**Depends on:** FP-G02

---

## J. Feedback & Export

---

### FP-J01 — Backend: POST /api/feedback/generate (Coaching Agent)
**Priority:** P0 · **Complexity:** M

**What it does:**  
Post-session: receives the full transcript turns, scenario, and persona. Calls Claude with a structured prompt instructing it to output `FeedbackResult` JSON. The Coaching Agent is separate from the Persona Agent — different system prompt, no persona character.

**System prompt instructs:**
- Return valid JSON matching `FeedbackResult` schema
- Identify ≥3 key moments (at least 1 "good", at least 1 "improvement")
- Reference specific turn content in explanations
- Keep `overallAssessment` to 2–3 sentences

**Acceptance criteria:**
- Returns `FeedbackResult` JSON (validated against schema before sending to frontend)
- If Claude returns invalid JSON: retry once, then return a minimal fallback feedback object
- Response time: best effort (5–15s acceptable since user is reviewing, not in real-time conversation)

**Files created:**
```
backend/src/
├── routes/
│   └── feedback.ts             ← POST /api/feedback/generate
└── agents/
    └── coachingAgent.ts        ← buildCoachingPrompt(), parseFeedbackResponse()
```

**Depends on:** FP-A02, FP-A04

---

### FP-J02 — Feedback Page: Overall Assessment + Coaching Tips
**Priority:** P0 · **Complexity:** S

**What it does:**  
Top section of the feedback page. Displays `overallAssessment` paragraph, `strengths` list, `improvementAreas` list, and `coachingTips` list. Calls the feedback API on mount with the completed session turns.

**Acceptance criteria:**
- Loading state shown while feedback generates (spinner + "Generating your feedback…")
- Error state if API fails: "Feedback unavailable — you can still review your transcript below"
- Strengths shown with green indicators; improvement areas with amber

**Files created:**
```
frontend/src/
├── components/feedback/
│   └── FeedbackSummary.tsx     ← overallAssessment, strengths, tips sections
└── pages/
    └── FeedbackPage.tsx        ← calls /api/feedback/generate on mount, holds FeedbackResult state
```

**Depends on:** FP-D01, FP-J01

---

### FP-J03 — Key Moments Highlight (≥3 Moments)
**Priority:** P0 · **Complexity:** M

**What it does:**  
In the feedback page transcript view, specific turns are highlighted with a badge ("Good practice" or "Needs improvement") and an explanation tooltip/card below the turn. Coaching Agent provides `turnId` references.

**Acceptance criteria:**
- ≥3 key moments highlighted (minimum 1 "good", minimum 1 "improvement" as per spec)
- Each highlighted turn has a visible badge and expandable explanation
- Scrolling to highlighted turns works (anchor links or scroll-into-view)
- If `turnId` doesn't match any turn: moment shown as a general note without transcript link

**Files created:**
```
frontend/src/
└── components/feedback/
    └── KeyMomentCard.tsx       ← badge (good/improvement), explanation text, turn reference
```

**Depends on:** FP-J02, FP-H01

---

### FP-J04 — Full Transcript Viewer (Scrollable)
**Priority:** P0 · **Complexity:** S

**What it does:**  
Complete session transcript on the feedback page. Read-only, scrollable. User and persona turns clearly distinguished. Timestamps shown. Key moment turns visually highlighted inline.

**Acceptance criteria:**
- All turns rendered in order with speaker label, timestamp, and text
- Key moment turns highlighted (matching FP-J03 badges)
- Scrollable within a fixed-height container (not full page scroll)

**Files created:**
```
frontend/src/
└── components/feedback/
    └── TranscriptViewer.tsx    ← read-only turn list with key moment highlights
```

**Depends on:** FP-D01, FP-J03

---

### FP-J05 — Session Metadata Bar
**Priority:** P0 · **Complexity:** S

**What it does:**  
Summary bar at top of feedback page: scenario name, persona name, total duration (mm:ss), total turn count.

**Acceptance criteria:**
- Duration calculated from `session.startedAt` to `session.endedAt`
- Turn count counts only completed (non-partial) turns
- All four fields always visible

**Files created / modified:**
```
frontend/src/
└── pages/
    └── FeedbackPage.tsx        ← metadata bar as inline component or separate SessionMeta.tsx
```

**Depends on:** FP-D01, FP-J02

---

### FP-J06 — Export Transcript (.txt, .json) + Clipboard Copy
**Priority:** P1 · **Complexity:** S

**What it does:**  
Three export options: copy full transcript to clipboard, download as `.txt`, download as `.json`.

**.txt format:**
```
AI Role Player Session
Scenario: Price Objection | Persona: Skeptical Sam | Duration: 08:23 | Turns: 12

[00:00:05] You: Hello, I wanted to talk about...
[00:00:12] Skeptical Sam: I've heard that before...
```

**.json format:** Full `Session` object including `FeedbackResult`.

**Acceptance criteria:**
- Clipboard copy: uses `navigator.clipboard.writeText`, shows "Copied!" toast for 2s
- Downloads triggered via `Blob` + `URL.createObjectURL` + `<a download>`
- JSON export includes metadata, turns, and feedback result

**Files created:**
```
frontend/src/
└── components/feedback/
    └── ExportControls.tsx      ← Copy, .txt download, .json download buttons
```

**Depends on:** FP-J04, FP-J05

---

### FP-J07 — Audio Artifact Download (Recorded User Turns)
**Priority:** P2 (optional per spec) · **Complexity:** M

**What it does:**  
If user audio blobs were retained during the session, allow downloading them as a zip of `.webm` files — one per user turn. Req 1.3.3 explicitly marks this as optional ("if implemented").

**Acceptance criteria:**
- Audio blobs captured during recording are stored in SessionContext alongside each turn (does not increase required storage — blobs are in-memory)
- "Download audio" button appears on feedback page only if blobs are available
- Downloads as `session-audio.zip` containing `turn-1-user.webm`, `turn-3-user.webm`, etc.
- If blobs not retained (session restarted, page refreshed): button hidden, no error

**Files created / modified:**
```
frontend/src/
├── context/
│   └── SessionContext.tsx      ← store audioBlob alongside each user Turn
└── components/feedback/
    └── ExportControls.tsx      ← conditional "Download audio" button
```

**Depends on:** FP-J06, FP-C02

---

## K. Admin Console

---

### FP-K01 — Admin Page Layout + Tab Navigation
**Priority:** P1 · **Complexity:** S

**What it does:**  
`/admin` route renders a tabbed layout: "Scenarios" tab and "Personas" tab. Each tab shows the list + a create button.

**Acceptance criteria:**
- Tab state persists across navigation (URL param: `/admin?tab=personas`)
- "Back to Dashboard" link visible
- No auth required for MVP (admin is route-based, not login-based)

**Files created / modified:**
```
frontend/src/
└── pages/
    └── AdminPage.tsx           ← tab state, layout, tab panels
```

**Depends on:** FP-A03

---

### FP-K02 — Scenario List + Delete
**Priority:** P1 · **Complexity:** S

**What it does:**  
Table/card list of all scenarios. Each row has Edit and Delete buttons. Delete asks for confirmation before calling `DELETE /api/admin/scenarios/:id`.

**Acceptance criteria:**
- List fetches on mount and after any CRUD operation
- Delete confirmation: "Delete 'Price Objection'? This cannot be undone."
- After delete: list refetches, deleted item disappears
- Empty state: "No scenarios yet — create your first one"

**Files created / modified:**
```
frontend/src/
├── components/admin/
│   └── ScenarioList.tsx        ← table with edit/delete per row
└── services/
    └── adminApi.ts             ← deleteScenario(id)
```

**Depends on:** FP-A06, FP-K01, FP-B01

---

### FP-K03 — Create / Edit Scenario Form
**Priority:** P1 · **Complexity:** L

**What it does:**  
Form for creating or editing a scenario. All fields from the data model: name, description, goals (add/remove list), skill focus, compatible personas (multi-select), scoring weights (dynamic rows, must sum to 100), voice behavior (3 dropdowns).

**Acceptance criteria:**
- Required fields: name, description, at least 1 goal
- Scoring weights: dynamic add/remove rows; real-time sum shown; submit blocked if sum ≠ 100
- Compatible personas: multi-select checkbox list from loaded personas
- On submit: `POST` or `PUT` to backend; on success: redirect back to list
- Validation errors shown inline (not alert boxes)

**Research note (Bland.ai lesson):**  
Admin forms must be non-developer friendly. Labels should be plain English, not technical field names. Add helper text explaining what each field does.

**Files created:**
```
frontend/src/
└── components/admin/
    └── ScenarioForm.tsx        ← all scenario fields, validation, submit
```

**Depends on:** FP-K02

---

### FP-K04 — Persona List + Delete
**Priority:** P1 · **Complexity:** S

**What it does:**  
Same pattern as FP-K02 but for personas. List with Edit/Delete per row.

**Files created / modified:**
```
frontend/src/
└── components/admin/
    └── PersonaList.tsx
```

**Depends on:** FP-K01, FP-B01

---

### FP-K05 — Create / Edit Persona Form
**Priority:** P1 · **Complexity:** M

**What it does:**  
Form for creating or editing a persona. Fields: name, traits (tag input), behavior notes (textarea), system prompt (large textarea), difficulty (Easy/Medium/Hard), voice (dropdown of OpenAI TTS voices).

**Acceptance criteria:**
- Required: name, system prompt
- Traits: tag-input component (type and press Enter to add; click X to remove)
- System prompt: textarea with character counter (max 2000 chars)
- Difficulty selection persists and is used by the conversation filter in FP-B03

**Files created:**
```
frontend/src/
└── components/admin/
    └── PersonaForm.tsx         ← all persona fields
```

**Depends on:** FP-K04

---

### FP-K06 — Persona Prompt Preview
**Priority:** P1 · **Complexity:** S

**What it does:**  
"Preview" button on the persona form calls a backend endpoint that generates a simulated greeting from the persona using the current system prompt. Shows the result in a side panel without saving.

**Acceptance criteria:**
- Preview sends current (unsaved) system prompt to backend
- Backend calls Claude for one turn with a "greet the salesperson" user message
- Result displayed in `PreviewPanel` within 3s
- Preview does not affect session state or saved data

**Files created:**
```
frontend/src/
├── components/admin/
│   └── PreviewPanel.tsx        ← preview result display
backend/src/
└── routes/
    └── admin.ts                ← POST /api/admin/preview-persona
```

**Depends on:** FP-K05, FP-A02

---

### FP-K07 — Admin CRUD Backend Endpoints (Full)
**Priority:** P1 · **Complexity:** M

**What it does:**  
Complete CRUD for scenarios and personas. Reads/writes to JSON files. File writes are wrapped in a simple async mutex to prevent race conditions.

**Endpoints:**
```
POST   /api/admin/scenarios
PUT    /api/admin/scenarios/:id
DELETE /api/admin/scenarios/:id
POST   /api/admin/personas
PUT    /api/admin/personas/:id
DELETE /api/admin/personas/:id
POST   /api/admin/preview-persona
```

**Acceptance criteria:**
- IDs generated with `crypto.randomUUID()`
- `createdAt` / `updatedAt` set on create/update
- File write is atomic: write to temp file, then rename (prevents partial-write corruption)
- Returns 404 if ID not found on PUT/DELETE

**Files created / modified:**
```
backend/src/
└── routes/
    └── admin.ts                ← all CRUD routes, file read/write helpers
```

**Depends on:** FP-B01

---

### FP-K08 — Live Dashboard Refresh (No Rebuild Required)
**Priority:** P1 · **Complexity:** S

**What it does:**  
Dashboard's scenario and persona selectors always fetch fresh data from the API on mount. No caching that could serve stale data. Admin changes are visible in the dashboard immediately after page navigation.

**Acceptance criteria:**
- `DashboardPage` fetches scenarios and personas on every mount (no in-memory cache between navigations)
- Adding a scenario in admin → navigating to dashboard → new scenario appears in dropdown
- No page refresh, no app rebuild required

**Files created / modified:**
```
frontend/src/
└── pages/
    └── DashboardPage.tsx       ← useEffect([]) fetches on mount, no stale cache
```

**Depends on:** FP-B02, FP-K07

---

## L. Deliverables — Documentation

---

### FP-L01 — Technical Documentation (README)
**Priority:** P0 · **Complexity:** M

**What it does:**  
A `README.md` at the project root that satisfies the spec's Technical Documentation deliverable. Must enable another engineer to understand and extend the system.

**Required sections (per spec):**
1. **Core Features** — what the app does, user flows, key capabilities
2. **Technical Approach & Design Decisions** — why this stack, why SSE over WebSocket, why two-agent pattern, parallel pipeline decision, PTT-first choice
3. **Architecture Diagram** — ASCII or image: Browser → Backend → Claude/Whisper/TTS
4. **Setup Guide** — step-by-step: clone, `npm install`, set env vars, `npm run dev` for both frontend + backend
5. **Dependencies & Requirements** — Node version, API keys needed, browser support matrix

**Acceptance criteria:**
- A fresh engineer can run the app locally following only the README (no verbal instructions needed)
- Architecture diagram shows all three service integrations (STT, LLM, TTS)
- Design decisions section explains at least: streaming choice, two-agent pattern, state machine approach, PTT default
- Browser support noted: Chrome (full), Firefox (full), Safari (partial — MediaRecorder polyfill required)

**Files created:**
```
README.md                       ← root-level, covers both frontend + backend
```

**Depends on:** All FPs (written last, after implementation is stable)

---

### FP-L02 — Environment & Setup Configuration
**Priority:** P0 · **Complexity:** S

**What it does:**  
`.env.example` files for both frontend and backend, listing every required environment variable with descriptions. Ensures the demo is reproducible from the source package alone.

**Required env vars:**
```
# backend/.env
ANTHROPIC_API_KEY=        # Claude API key (claude-sonnet-4-6)
OPENAI_API_KEY=           # Whisper STT + TTS
PORT=3001
NODE_ENV=development

# frontend/.env (if needed)
VITE_API_BASE_URL=http://localhost:3001
```

**Acceptance criteria:**
- Running `cp .env.example .env` + filling in API keys is the only setup step
- App fails with a clear startup error if required keys are missing (not a silent runtime failure)
- `.env` files are in `.gitignore`; `.env.example` is committed

**Files created:**
```
backend/.env.example
backend/.gitignore
frontend/.env.example           ← only if VITE_ vars are needed
.gitignore                      ← root level
```

**Depends on:** FP-A02

---

## Summary: File → Function Point Map

```
frontend/src/
├── App.tsx                         FP-A03
├── main.tsx                        FP-A01
├── types/index.ts                  FP-A04
├── context/
│   └── SessionContext.tsx          FP-D01, FP-B05
├── services/
│   ├── api.ts                      FP-A06, FP-I04
│   ├── voiceApi.ts                 FP-E02, FP-G01
│   └── adminApi.ts                 FP-A06, FP-K02, FP-K04
├── hooks/
│   ├── useVoiceRecorder.ts         FP-C01, FP-C02, FP-C03, FP-C04, FP-C06, FP-G04
│   ├── useAudioPlayer.ts           FP-G02, FP-G04, FP-I06
│   ├── useStreamingTranscript.ts   FP-F03, FP-I05
│   └── useEarcons.ts               FP-D03
├── pages/
│   ├── DashboardPage.tsx           FP-B02, FP-B03, FP-B04, FP-B05, FP-K08
│   ├── SessionPage.tsx             FP-E02, FP-G04, FP-I02
│   ├── FeedbackPage.tsx            FP-J02, FP-J05
│   └── AdminPage.tsx               FP-K01
├── components/
│   ├── dashboard/
│   │   ├── ScenarioSelector.tsx    FP-B02
│   │   ├── PersonaSelector.tsx     FP-B03
│   │   ├── DifficultySelector.tsx  FP-B04
│   │   ├── SessionSummaryCard.tsx  FP-B04
│   │   └── OnboardingOverlay.tsx   FP-B05
│   ├── session/
│   │   ├── VoicePanel.tsx          FP-C02, FP-C03, FP-C05, FP-C06
│   │   ├── WaveformCanvas.tsx      FP-C04
│   │   ├── MicPermissionGuide.tsx  FP-C01
│   │   ├── SessionStateIndicator.tsx  FP-D02
│   │   ├── TranscriptPanel.tsx     FP-H01, FP-H02, FP-H03
│   │   ├── PlaybackControls.tsx    FP-G03
│   │   ├── SessionControls.tsx     FP-I01, FP-I02, FP-I03
│   │   ├── SttFallbackInput.tsx    FP-E03
│   │   └── ErrorToast.tsx          FP-I04
│   ├── feedback/
│   │   ├── FeedbackSummary.tsx     FP-J02
│   │   ├── KeyMomentCard.tsx       FP-J03
│   │   ├── TranscriptViewer.tsx    FP-J04
│   │   ├── ExportControls.tsx      FP-J06
│   │   └── SessionMeta.tsx         FP-J05
│   └── admin/
│       ├── ScenarioList.tsx        FP-K02
│       ├── ScenarioForm.tsx        FP-K03
│       ├── PersonaList.tsx         FP-K04
│       ├── PersonaForm.tsx         FP-K05
│       └── PreviewPanel.tsx        FP-K06

backend/src/
├── index.ts                        FP-A02
├── types/index.ts                  FP-A04
├── middleware/
│   └── errorHandler.ts             FP-A02
├── routes/
│   ├── health.ts                   FP-A02
│   ├── audio.ts                    FP-E01
│   ├── chat.ts                     FP-F02
│   ├── tts.ts                      FP-G01
│   ├── feedback.ts                 FP-J01
│   └── admin.ts                    FP-B01, FP-K07, FP-K06
├── agents/
│   ├── personaAgent.ts             FP-F01, FP-F02, FP-F04
│   └── coachingAgent.ts            FP-J01
└── data/
    ├── scenarios.json              FP-A05
    └── personas.json               FP-A05
```

---

## Build Order (Dependencies Resolved)

```
Week 1, Day 1:   FP-A01 → FP-A02 → FP-A03 → FP-A04 → FP-A05 → FP-A06
Week 1, Day 1:   FP-B01 → FP-B02 → FP-B03 → FP-B04 → FP-D01 → FP-B05
Week 1, Day 1:   FP-L02  (env setup, do this alongside scaffold)
Week 1, Day 2:   FP-C01 → FP-C02 → FP-C04 → FP-C05 → FP-C06 → FP-C03
Week 1, Day 2:   FP-D02 → FP-D03
Week 1, Day 3:   FP-E01 → FP-E02 → FP-E03
Week 1, Day 3:   FP-F01 → FP-F02 → FP-F03 → FP-F04
Week 1, Day 4:   FP-G01 → FP-G02 → FP-G03 → FP-G04
Week 1, Day 4:   FP-H01 → FP-H02 → FP-H03
Week 1, Day 5:   FP-I01 → FP-I02 → FP-I03 → FP-I04 → FP-I05 → FP-I06
Week 2, Day 1:   FP-J01 → FP-J02 → FP-J03 → FP-J04 → FP-J05 → FP-J06
Week 2, Day 1:   FP-J07  (P2 stretch — only if time allows)
Week 2, Day 2:   FP-K01 → FP-K02 → FP-K03 → FP-K04 → FP-K05 → FP-K06 → FP-K07 → FP-K08
Week 2, Day 2:   FP-L01  (README written last, after implementation is stable)
```

---

## Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| v1 | 2026-04-27 | hongzhang | Initial breakdown from requirements + voice UX research |
| v1.1 | 2026-04-27 | hongzhang | Gap review against requirement.txt: added FP-J07, FP-L01, FP-L02; patched FP-F03 for empty/malformed response; updated domain map + build order |
