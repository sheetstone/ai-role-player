# AI Role Player

A voice-first web application for sales training. Sales reps practice customer conversations with AI-simulated personas; managers configure scenarios, personas, and scoring rubrics from an admin console.

---

## Table of Contents

1. [Core Features](#1-core-features)
2. [Architecture](#2-architecture)
3. [Tech Stack & Design Decisions](#3-tech-stack--design-decisions)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Setup & Running Locally](#6-setup--running-locally)
7. [Environment Variables](#7-environment-variables)
8. [Browser Support](#8-browser-support)

---

## 1. Core Features

| Feature | Description |
|---|---|
| **Learner Dashboard** | Select scenario, persona, and difficulty; preview goals and persona traits before starting |
| **Voice Role-Play Session** | Push-to-talk or tap-to-record input; real-time waveform; AI persona responds in speech |
| **Streaming Pipeline** | STT → LLM → TTS running in parallel layers to minimise perceived latency |
| **Session State Machine** | Six explicit states (Idle / Listening / Processing / Speaking / Paused / Ended) with animated visual indicators |
| **Interruption Support** | User can cut the AI off mid-sentence; playback stops within 200 ms |
| **Coaching & Feedback** | Post-session AI-generated summary: overall assessment, coaching tips, ≥ 3 highlighted key moments (good practice / needs improvement) |
| **Export** | Download session transcript as `.txt` or `.json`; copy to clipboard |
| **Admin Console** | CRUD for scenarios and personas; configure scoring weights, voice behaviour, and persona compatibility per scenario; changes reflect in the dashboard instantly |

---

## 2. Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser (SPA)                  │
│                                                  │
│  React 19 + TypeScript                           │
│  ┌───────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ Dashboard │ │  Session   │ │   Feedback    │  │
│  └───────────┘ └────────────┘ └───────────────┘  │
│  ┌────────────────────────────────────────────┐   │
│  │          Admin Console  (/admin)           │   │
│  └────────────────────────────────────────────┘   │
│                                                  │
│  Web Audio API  ◄──────►  Voice Pipeline Layer   │
└───────────────────────────┬──────────────────────┘
                            │  REST + SSE
┌───────────────────────────▼──────────────────────┐
│               Node.js / Express 5                │
│                                                  │
│  POST /api/audio/transcribe   ──►  OpenAI Whisper│
│  POST /api/chat/turn (SSE)    ──►  Claude API    │
│  POST /api/tts/speak          ──►  OpenAI TTS    │
│  POST /api/feedback/generate  ──►  Claude API    │
│  /api/admin/*  (CRUD)         ──►  JSON files    │
└──────────────────────────────────────────────────┘
```

### Voice pipeline (per turn)

```
[Mic] ──► MediaRecorder ──► POST /audio/transcribe (Whisper)
                                    │
                                    ▼ user text
                         POST /chat/turn ──► Claude SSE stream
                                    │           │
                                    │           ▼ token deltas
                                    │     TranscriptPanel (live)
                                    │
                                    ▼ fullText (on stream done)
                         POST /tts/speak ──► OpenAI TTS (chunked)
                                    │
                                    ▼ audio chunks
                         AudioContext ──► playback starts on first chunk
```

Each layer starts as soon as the previous layer produces its first output — STT result triggers the LLM call, and the first LLM sentence triggers TTS before the full response is complete.

---

## 3. Tech Stack & Design Decisions

### Frontend

| Package | Version | Why |
|---|---|---|
| React | 19 | Required by spec; concurrent features simplify streaming state updates |
| TypeScript | 6 | Strict mode catches voice-state bugs at compile time, not runtime |
| Vite | 8 | Sub-second HMR during development; native ESM |
| React Router | 6 | Client-side routing for Dashboard / Session / Feedback / Admin |
| React Context + useReducer | — | State machine for the session lifecycle; no external store needed |
| Web Audio API | native | Recording, waveform visualisation, gapless TTS chunk playback |
| Prettier | 3 | Consistent formatting without style debates |

### Backend

| Package | Version | Why |
|---|---|---|
| Express | 5 | Minimal HTTP layer; `res.write()` makes SSE trivial |
| tsx | 4 | Runs TypeScript directly in development — no compile step, instant restarts |
| dotenv | 17 | Loads API keys from `.env` on startup |
| cors | 2 | Allows the Vite dev server (port 5173) to call the API (port 3001) |
| `@anthropic-ai/sdk` | latest | Claude for both the Persona Agent and Coaching Agent |
| `openai` | 4 | Whisper STT and TTS |

### Key design decisions

**SSE over WebSockets for LLM streaming**  
The LLM call is strictly server-to-client (token deltas). Server-Sent Events are simpler to implement and debug than WebSockets for this one-directional stream — no upgrade handshake, works through HTTP/2, and the `EventSource` API is built into every browser.

**Two-agent pattern (Persona Agent + Coaching Agent)**  
The Persona Agent runs in real time during the session, constrained to stay in character. The Coaching Agent runs once after the session ends with a completely different system prompt, producing structured `FeedbackResult` JSON. Separating them means neither agent's prompt compromises the other's behaviour.

**Push-to-talk as the default input mode**  
Hands-free voice detection is convenient but unreliable in noisy sales environments and adds latency from false-trigger guards. PTT gives learners intentional, controlled input — particularly important when they are nervous. Tap-to-record is offered as an alternative.

**Chunked TTS streaming for low time-to-first-audio**  
The first 1–2 sentences of the LLM response are sent to TTS as soon as they are complete, while the LLM continues generating the rest. The browser starts playing the first audio chunk (via `AudioBufferSourceNode`) before the full response is available. This is the primary lever for meeting the ≤ 2.5 s first-audio target.

**JSON flat files for admin data (dev)**  
Scenarios and personas are stored in `backend/src/data/scenarios.json` and `personas.json`. Reads happen on every request so admin changes are immediately visible in the dashboard — no cache invalidation needed. Writes are atomic (write to temp file, then rename) to prevent corruption. SQLite can replace this for production.

**Structured conversation phases in the Persona Agent prompt**  
Rather than a free-form persona description, each system prompt includes an explicit phase guide (`Opening → Discovery → Pitch → Objection Handling → Closing`). This reduces hallucinations and keeps sessions relevant to the chosen scenario, following the same pattern used by production voice-AI platforms (e.g. Retell AI).

---

## 4. Project Structure

```
ai-role-player/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/       # ScenarioSelector, PersonaSelector, etc.
│   │   │   ├── session/         # VoicePanel, TranscriptPanel, SessionControls, etc.
│   │   │   ├── feedback/        # FeedbackSummary, KeyMomentCard, ExportControls, etc.
│   │   │   └── admin/           # ScenarioForm, PersonaForm, PreviewPanel, etc.
│   │   ├── context/
│   │   │   └── SessionContext.tsx   # Session state machine (useReducer)
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts  # MediaRecorder + Web Audio API
│   │   │   ├── useAudioPlayer.ts    # Chunked TTS playback
│   │   │   ├── useStreamingTranscript.ts  # SSE consumer
│   │   │   └── useEarcons.ts        # State-transition audio cues
│   │   ├── pages/               # DashboardPage, SessionPage, FeedbackPage, AdminPage
│   │   ├── services/            # API client wrappers (voiceApi, adminApi)
│   │   └── types/               # Shared TypeScript interfaces
│   ├── vite.config.ts           # Proxy /api → localhost:3001
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── personaAgent.ts      # Builds prompt + streams Claude response
│   │   │   └── coachingAgent.ts     # Post-session feedback generation
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── audio.ts             # POST /api/audio/transcribe
│   │   │   ├── chat.ts              # POST /api/chat/turn (SSE)
│   │   │   ├── tts.ts               # POST /api/tts/speak
│   │   │   ├── feedback.ts          # POST /api/feedback/generate
│   │   │   └── admin.ts             # CRUD /api/admin/scenarios|personas
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── data/
│   │   │   ├── scenarios.json
│   │   │   └── personas.json
│   │   └── index.ts                 # Express app entry point
│   ├── .env.example
│   └── package.json
│
├── plan/                        # Implementation plan + research docs
└── README.md
```

---

## 5. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 22.x |
| npm | ≥ 10.x |
| Anthropic API key | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI API key | [platform.openai.com](https://platform.openai.com) — used for Whisper STT and TTS |

---

## 6. Setup & Running Locally

### 1. Clone the repository

```bash
git clone <repo-url>
cd ai-role-player
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and OPENAI_API_KEY
npm install
npm run dev
# Backend running at http://localhost:3001
```

### 3. Set up the frontend (new terminal tab)

```bash
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:5173
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173).  
The frontend proxies all `/api/*` requests to the backend automatically — no extra configuration needed.

### Useful commands

| Command | Location | What it does |
|---|---|---|
| `npm run dev` | `frontend/` | Start Vite dev server with HMR |
| `npm run build` | `frontend/` | Production build to `frontend/dist/` |
| `npm run lint` | `frontend/` | ESLint check |
| `npm run dev` | `backend/` | Start Express with `tsx watch` (auto-restart on save) |
| `npm run typecheck` | `backend/` | TypeScript type check without emitting |
| `npm run build` | `backend/` | Compile TypeScript to `backend/dist/` |

---

## 7. Environment Variables

All variables are set in `backend/.env` (copy from `backend/.env.example`).

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Used by the Persona Agent (`claude-sonnet-4-6`) and Coaching Agent |
| `OPENAI_API_KEY` | Yes | Used by Whisper STT (`whisper-1`) and TTS (`tts-1`) |
| `PORT` | No | Backend port (default: `3001`) |
| `NODE_ENV` | No | `development` or `production` |

The backend will start but API calls will fail with a clear error if keys are missing.

---

## 8. Browser Support

| Browser | Support | Notes |
|---|---|---|
| Chrome 120+ | Full | Primary development target |
| Firefox 120+ | Full | `MediaRecorder` outputs `audio/ogg`; backend accepts it |
| Safari 17+ | Partial | `MediaRecorder` requires the `audio/mp4` MIME type; a `RecordRTC` polyfill may be needed for older Safari versions |
| Edge 120+ | Full | Chromium-based; same as Chrome |

Voice features require:
- Microphone permission granted by the user
- A secure context (`https://` or `localhost`) — browsers block `getUserMedia` on plain `http://`
