# AI Role Player — Implementation Plan
**Version:** v1  
**Date:** 2026-04-27  
**Status:** Draft

---

## Table of Contents

1. [Requirements Analysis](#1-requirements-analysis)
2. [Architecture Decision](#2-architecture-decision)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Data Model](#5-data-model)
6. [API Contract](#6-api-contract)
7. [Implementation Phases](#7-implementation-phases)
8. [Voice Pipeline Detail](#8-voice-pipeline-detail)
9. [State Machine](#9-state-machine)
10. [Risk & Mitigation](#10-risk--mitigation)

---

## 1. Requirements Analysis

### 1.1 Core User Journeys

| Journey | Entry Point | Key Constraint |
|---|---|---|
| Learner starts a role-play | Dashboard → scenario/persona/difficulty → Start | Single CTA, summary preview before start |
| Voice conversation loop | Session view → speak → AI responds | ≤300ms indicator, ≤1.5s partial transcript, ≤2.5s first audio |
| Review feedback | Session end → feedback page | ≥3 highlighted key moments, export .txt/.json |
| Admin manages content | Admin route → CRUD scenarios/personas | Live-reflected without rebuild |

### 1.2 Critical Non-Functional Constraints

- **300ms** — show "Processing…" after user stops recording (pure UI state flip, no API call needed)
- **1.5s** — first partial transcript visible (STT streaming or mock)
- **2.5s** — AI speech playback begins (TTS streaming + audio chunking)
- **UI never freezes** — all API calls are non-blocking; cancel/scroll always available

### 1.3 Scope Boundaries (MVP)

**In scope:** All acceptance criteria items 1.1–1.4, latency targets with best-effort real or mock services, technical documentation.

**Out of scope (stretch):** Audio artifact download, multi-region deployment, user auth/login system, analytics dashboard.

---

## 2. Architecture Decision

### 2.1 Overall Pattern

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│                                             │
│  React SPA (TypeScript)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Dashboard│  │ Session  │  │ Feedback │  │
│  │   View   │  │   View   │  │   View   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────────────────────────────────┐   │
│  │        Admin Console (/admin)        │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Web Audio API  ←→  Voice Pipeline Layer    │
└──────────────────────┬──────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────┐
│             Node.js / Express Backend        │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  /audio  │  │  /chat   │  │  /admin  │  │
│  │  (STT)   │  │  (LLM)   │  │  (CRUD)  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │             │         │
│  Whisper API   Claude API    JSON file store │
│  (OpenAI STT)  (Anthropic)   or SQLite       │
│                    │                         │
│             ┌──────▼──────┐                 │
│             │  TTS Service│                 │
│             │(ElevenLabs/ │                 │
│             │  OpenAI TTS)│                 │
│             └─────────────┘                 │
└─────────────────────────────────────────────┘
```

### 2.2 Key Architectural Choices

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | React + TypeScript | Required by spec, strong typing reduces voice state bugs |
| Backend | Node.js (Express) | Same language stack, easy streaming with `res.write()` |
| LLM | Claude (Anthropic) | Multi-agent/skills encouraged; `claude-sonnet-4-6` best latency/quality |
| STT | OpenAI Whisper API | Best accuracy, streaming transcript support |
| TTS | OpenAI TTS or ElevenLabs | OpenAI TTS: lower latency; ElevenLabs: more expressive personas |
| Data persistence | JSON flat files (dev) → SQLite (prod) | Fast to scaffold, admin live-updates without rebuild |
| State management | React Context + useReducer | Sufficient for session state machine, no Redux overhead |
| Transport | REST for CRUD, SSE for streaming LLM | Server-Sent Events keep transcript streaming simple |

### 2.3 Multi-Agent Strategy

The LLM call uses a **two-agent pattern**:

1. **Persona Agent** — plays the customer persona, constrained by persona prompt + scenario context. Produces conversational reply.
2. **Coaching Agent** — runs post-session, analyzes transcript, produces structured feedback JSON (strengths, tips, key moments).

Both agents share the session transcript as context. The Persona Agent runs in real-time; the Coaching Agent runs once on session end.

---

## 3. Tech Stack

### Frontend

| Package | Version | Purpose |
|---|---|---|
| `react` + `react-dom` | 18.x | UI framework |
| `typescript` | 5.x | Type safety |
| `vite` | 5.x | Dev server + build |
| `react-router-dom` | 6.x | Client-side routing |
| `zustand` or React Context | — | Session state (Context preferred per spec) |
| `wavesurfer.js` | 7.x | Live waveform / input level meter |
| Web Audio API | native | Recording, playback |

### Backend

| Package | Version | Purpose |
|---|---|---|
| `express` | 4.x | HTTP server |
| `@anthropic-ai/sdk` | latest | LLM calls (Claude) |
| `openai` | 4.x | Whisper STT + TTS |
| `multer` | 1.x | Audio file upload handling |
| `cors` | 2.x | Dev CORS |
| `dotenv` | 16.x | Env vars |
| `better-sqlite3` | 9.x | Optional: SQLite for admin data |

### Dev Tooling

- `eslint` + `prettier` — code quality
- `vitest` — unit tests (state machine, feedback parser)
- `tsx` — backend TypeScript execution

---

## 4. Project Structure

```
ai-role-player/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable atoms (Button, Select, Badge)
│   │   │   ├── dashboard/
│   │   │   │   ├── ScenarioSelector.tsx
│   │   │   │   ├── PersonaSelector.tsx
│   │   │   │   ├── DifficultySelector.tsx
│   │   │   │   └── SessionSummaryCard.tsx
│   │   │   ├── session/
│   │   │   │   ├── VoicePanel.tsx         # Recording controls + waveform
│   │   │   │   ├── TranscriptPanel.tsx    # Streaming transcript
│   │   │   │   ├── SessionStateIndicator.tsx
│   │   │   │   ├── PlaybackControls.tsx
│   │   │   │   └── MicPermissionGuide.tsx
│   │   │   ├── feedback/
│   │   │   │   ├── FeedbackSummary.tsx
│   │   │   │   ├── KeyMomentCard.tsx
│   │   │   │   ├── TranscriptViewer.tsx
│   │   │   │   └── ExportControls.tsx
│   │   │   └── admin/
│   │   │       ├── ScenarioForm.tsx
│   │   │       ├── PersonaForm.tsx
│   │   │       └── PreviewPanel.tsx
│   │   ├── context/
│   │   │   └── SessionContext.tsx         # Session state machine + dispatch
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts        # Web Audio API abstraction
│   │   │   ├── useAudioPlayer.ts          # Playback abstraction
│   │   │   └── useStreamingTranscript.ts  # SSE consumption
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── SessionPage.tsx
│   │   │   ├── FeedbackPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts                     # Backend HTTP client
│   │   │   └── adminApi.ts
│   │   ├── types/
│   │   │   └── index.ts                   # Shared TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── audio.ts    # POST /audio/transcribe
│   │   │   ├── chat.ts     # POST /chat/turn  (SSE)
│   │   │   ├── tts.ts      # POST /tts/speak
│   │   │   └── admin.ts    # CRUD /admin/scenarios, /admin/personas
│   │   ├── agents/
│   │   │   ├── personaAgent.ts    # Streaming persona reply
│   │   │   └── coachingAgent.ts   # Post-session feedback
│   │   ├── data/
│   │   │   ├── scenarios.json
│   │   │   └── personas.json
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
│
├── plan/
│   └── 2026-04-27_implementation-plan_v1.md
├── CLAUDE.md
└── README.md
```

---

## 5. Data Model

### Scenario

```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  goals: string[];           // success criteria checklist
  suggestedSkillFocus: string;
  compatiblePersonaIds: string[];
  scoringWeights: {
    category: string;        // e.g. "Discovery"
    weight: number;          // 0–100, sum must equal 100
  }[];
  voiceBehavior: {
    interruptFrequency: "low" | "medium" | "high";
    speakingPace: "slow" | "normal" | "fast";
    toneStyle: string;       // e.g. "skeptical", "friendly"
  };
  createdAt: string;
  updatedAt: string;
}
```

### Persona

```typescript
interface Persona {
  id: string;
  name: string;
  traits: string[];          // e.g. ["skeptical", "price-sensitive"]
  behaviorNotes: string;
  systemPrompt: string;      // injected into LLM context
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
  updatedAt: string;
}
```

### Session (frontend-only, not persisted)

```typescript
interface Session {
  id: string;
  scenario: Scenario;
  persona: Persona;
  difficulty: "easy" | "medium" | "hard";
  turns: Turn[];
  state: SessionState;
  startedAt: number;
  endedAt?: number;
}

interface Turn {
  id: string;
  speaker: "user" | "persona";
  text: string;
  audioUrl?: string;
  timestamp: number;
  partial?: boolean;
}

type SessionState = "idle" | "listening" | "processing" | "speaking" | "paused" | "ended";
```

### Feedback (returned by Coaching Agent)

```typescript
interface FeedbackResult {
  overallAssessment: string;
  strengths: string[];
  improvementAreas: string[];
  coachingTips: string[];
  keyMoments: {
    turnId: string;
    type: "good" | "improvement";
    label: string;
    explanation: string;
  }[];
  metadata: {
    scenario: string;
    persona: string;
    durationSeconds: number;
    turnCount: number;
  };
}
```

---

## 6. API Contract

### Voice Pipeline

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | `/audio/transcribe` | `multipart/form-data` audio blob | `{ text: string, partial: boolean }` | Calls Whisper |
| POST | `/chat/turn` | `{ sessionId, history, personaId, scenarioId, userText }` | SSE stream: `{ delta: string }` chunks | Persona Agent, streams LLM tokens |
| POST | `/tts/speak` | `{ text: string, voice?: string }` | Audio stream (binary chunks) | TTS service, chunked for low TTFA |

### Admin CRUD

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/scenarios` | List all |
| POST | `/admin/scenarios` | Create |
| PUT | `/admin/scenarios/:id` | Update, triggers live reload via cache bust |
| DELETE | `/admin/scenarios/:id` | Delete |
| GET | `/admin/personas` | List all |
| POST | `/admin/personas` | Create |
| PUT | `/admin/personas/:id` | Update |
| DELETE | `/admin/personas/:id` | Delete |

### Feedback

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/feedback/generate` | `{ turns: Turn[], scenarioId, personaId }` | `FeedbackResult` JSON |

---

## 7. Implementation Phases

### Phase 1 — Project Scaffold & Static Shell (Day 1)

**Goal:** Running dev environment, routing, placeholder pages, no API calls.

- [ ] Init frontend with `npm create vite@latest frontend -- --template react-ts`
- [ ] Init backend with `npm init`, Express + TypeScript setup
- [ ] Configure CORS, proxy in Vite config
- [ ] Create all page components as stubs (`DashboardPage`, `SessionPage`, `FeedbackPage`, `AdminPage`)
- [ ] Wire `react-router-dom` routes: `/`, `/session`, `/feedback`, `/admin`
- [ ] Seed `scenarios.json` and `personas.json` with 3 scenarios + 4 personas
- [ ] Build `GET /admin/scenarios` and `GET /admin/personas` endpoints
- [ ] Render scenario/persona lists in Dashboard with static selectors

**Exit criterion:** `npm run dev` shows a navigable shell with seeded data in dropdowns.

---

### Phase 2 — Voice Recording Foundation (Day 1–2)

**Goal:** Mic capture working with visual feedback; no AI calls yet.

- [ ] Implement `useVoiceRecorder` hook
  - `navigator.mediaDevices.getUserMedia` with permission error handling
  - `MediaRecorder` API for push-to-talk and tap-to-record modes
  - Emit audio blob on stop
- [ ] Implement `MicPermissionGuide` component (shown on denial)
- [ ] Implement live waveform using `AnalyserNode` from Web Audio API (or `wavesurfer.js`)
- [ ] Build `VoicePanel` with:
  - Mic button (hold = PTT, click = toggle)
  - Recording timer (mm:ss)
  - Waveform / level meter
  - Cancel button
- [ ] Wire `SessionStateIndicator` to show state labels with color coding

**Exit criterion:** Can record audio, see waveform, cancel, and the blob is accessible in state.

---

### Phase 3 — Voice Pipeline Integration (Day 2–3)

**Goal:** Full end-to-end voice loop with real or mocked AI.

- [ ] Backend: `POST /audio/transcribe` — forward audio to Whisper, return transcript
- [ ] Backend: `POST /chat/turn` — call Claude via `personaAgent.ts`, stream response via SSE
  - System prompt: `[persona.systemPrompt] + [scenario context] + [conversation history]`
  - Use `anthropic.messages.stream()` for token streaming
- [ ] Backend: `POST /tts/speak` — call OpenAI TTS, pipe audio chunks back
- [ ] Frontend: `useStreamingTranscript` hook — consumes SSE, appends to `turns`
- [ ] Frontend: `useAudioPlayer` hook — receives audio stream, plays via `AudioContext`
  - Start playback as soon as first chunk arrives (TTFA target ≤2.5s)
- [ ] Wire full session loop: record → transcribe → LLM stream → TTS → play
- [ ] Add `PlaybackControls`: mute/unmute, volume slider, stop/skip

**State transitions during a turn:**
```
Listening → (user stops) → Processing (300ms UI flip) → Speaking → Idle/Listening
```

**Exit criterion:** Speak a sentence, hear the AI persona reply within 2.5s, transcript updates in real time.

---

### Phase 4 — Session Management & Robustness (Day 3)

**Goal:** Full session lifecycle + error resilience.

- [ ] Implement `SessionContext` with `useReducer` for state machine
- [ ] Session controls: Pause (halts mic + playback), Resume, End, Restart
- [ ] Add error boundaries for each major view
- [ ] Implement retry logic for transcription and LLM errors (max 2 retries, exponential backoff)
- [ ] Handle timeout: if no LLM response in 8s, show retry prompt
- [ ] Handle empty/malformed LLM response gracefully
- [ ] Handle audio codec failures: fallback message + skip to text-only mode
- [ ] Mic permission denied: `MicPermissionGuide` with browser-specific steps

**Exit criterion:** Simulated service failures show helpful messages; session can pause/resume/end cleanly.

---

### Phase 5 — Feedback & Export (Day 4)

**Goal:** Post-session coaching summary with highlights and export.

- [ ] Backend: `POST /feedback/generate` — call Claude via `coachingAgent.ts`
  - System prompt instructs structured JSON output: `FeedbackResult`
  - Extract ≥3 key moments from turn IDs
- [ ] `FeedbackPage`: render `overallAssessment`, `coachingTips`, `strengths`
- [ ] `KeyMomentCard`: display highlighted transcript moments (good/needs improvement badge)
- [ ] `TranscriptViewer`: scrollable full transcript, copy to clipboard button
- [ ] Export: download as `.txt` and `.json`
- [ ] Session metadata bar: scenario name, persona name, duration, turn count

**Exit criterion:** End a session, land on feedback page with ≥3 key moments highlighted and export working.

---

### Phase 6 — Admin Console (Day 4–5)

**Goal:** CRUD for scenarios and personas, live-reflected in dashboard.

- [ ] `AdminPage` with tabbed view: Scenarios | Personas
- [ ] `ScenarioForm`: all fields including scoring weights (dynamic add/remove rows) and voice behavior config
- [ ] `PersonaForm`: traits, behavior notes, system prompt, difficulty
- [ ] `PreviewPanel`: show computed system prompt for a persona, simulate greeting
- [ ] Backend: complete CRUD endpoints for `/admin/scenarios` and `/admin/personas`
  - Write to JSON files on disk; dashboard reads from same files via GET
- [ ] Input validation: required fields, max lengths, scoring weights sum = 100
- [ ] Dashboard refetches on mount — admin changes are immediately visible

**Exit criterion:** Create a new scenario in admin, navigate to dashboard, see it in the dropdown.

---

### Phase 7 — Polish & Latency Validation (Day 5)

**Goal:** Verify all NFR targets and clean up UX rough edges.

- [ ] Instrument `performance.now()` checkpoints: recording-stop → indicator shown (target ≤300ms)
- [ ] Measure partial transcript time (target ≤1.5s)
- [ ] Measure TTFA for TTS (target ≤2.5s)
- [ ] Add "thinking" indicator between LLM call and first token
- [ ] Ensure UI responsiveness during processing (scroll works, cancel works)
- [ ] Cross-browser test: Chrome, Firefox, Safari (WebKit has Audio API quirks)
- [ ] Write `README.md`: setup guide, architecture summary, tech stack, design decisions

**Exit criterion:** All latency targets met (or documented as best-effort with real APIs), demo rehearsed end-to-end.

---

## 8. Voice Pipeline Detail

### Recording Flow

```
user action (hold/tap)
    ↓
getUserMedia() → MediaStream
    ↓
AudioContext → AnalyserNode → waveform visualizer (requestAnimationFrame)
    ↓
MediaRecorder.start() → ondataavailable → accumulate chunks
    ↓
user action (release/tap)
    ↓
MediaRecorder.stop() → Blob (audio/webm;codecs=opus)
    ↓
→ dispatch(SET_STATE, 'processing')   ← this must happen within 300ms
→ POST /audio/transcribe (async)
```

### LLM Streaming Flow

```
POST /chat/turn
    ↓
anthropic.messages.stream({ ... })
    ↓
for await (chunk of stream)
    → SSE: data: {"delta": "..."}\n\n     ← browser receives, appends to transcript
    ↓
on stream complete → POST /tts/speak with full text
```

### TTS Streaming Flow

```
POST /tts/speak
    ↓
openai.audio.speech.create({ model: "tts-1", voice, input, response_format: "mp3" })
    ↓
pipe response body as chunked binary
    ↓
frontend: fetch() → res.body ReadableStream
    → Web Audio API: AudioContext.decodeAudioData on each chunk
    → AudioBufferSourceNode.start()        ← TTFA target ≤2.5s
```

---

## 9. State Machine

```
         ┌─────────────────────────────────────────────────────────────────┐
         │                                                                 │
         ▼                                                                 │
      [IDLE] ──── startSession ────► [LISTENING]                          │
                                         │                                │
                               stopRecording                              │
                                         │                                │
                                         ▼                                │
                                   [PROCESSING] ──── error ──► [IDLE]    │
                                         │                                │
                               firstAudioChunk                            │
                                         │                                │
                                         ▼                                │
                                   [SPEAKING] ──── pauseSession ──────► [PAUSED]
                                         │                                │
                              audioComplete / skipAI                      │
                                         │                               resumeSession
                                         ▼                                │
                                   [LISTENING] ◄─────────────────────────┘
                                         │
                                    endSession
                                         │
                                         ▼
                                     [ENDED]
                                         │
                               navigate to /feedback
```

**UI color coding:**
- `IDLE` — grey
- `LISTENING` — red pulse (recording)
- `PROCESSING` — yellow spinner
- `SPEAKING` — blue waveform
- `PAUSED` — orange static
- `ENDED` — green checkmark

---

## 10. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Whisper STT latency > 1.5s on long audio | Medium | Medium | Cap recording at 30s; show partial mock text immediately, replace on real result |
| TTS TTFA > 2.5s for long AI responses | High | High | Truncate first TTS segment to ≤2 sentences; stream rest while playing |
| OpenAI API rate limit during demo | Low | High | Cache 3 pre-recorded persona responses as fallback audio files |
| `MediaRecorder` not supported in Safari | Medium | Medium | Polyfill with `RecordRTC`; test early |
| Audio codec incompatibility | Low | Medium | Accept `audio/webm` on Chrome; transcode to `audio/mp4` via `ffmpeg` in backend if needed |
| Admin JSON file race condition | Low | Low | Wrap file writes in an async queue or use SQLite with transactions |
| Claude API tokens exceed context for long sessions | Low | Medium | Summarize older turns after 10 exchanges; keep last 5 full turns |

---

## Revision History

| Version | Date | Author | Summary |
|---|---|---|---|
| v1 | 2026-04-27 | hongzhang | Initial plan from requirements analysis |
