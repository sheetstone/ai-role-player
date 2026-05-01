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
9. [Production Deployment](#9-production-deployment)

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
| **Model Switcher** | Gear-icon dropdown on every page lets you switch chat model (Gemini 2.5 Flash, 2.5 Flash Lite, 3 Flash, 3.1 Flash Lite) and voice model (2.5 / 3.1 Flash TTS) without restarting; selection persisted to localStorage |
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
│  POST /api/audio/transcribe   ──►  Gemini STT    │
│  POST /api/chat/turn (SSE)    ──►  Gemini API    │
│  POST /api/tts/speak          ──►  Gemini TTS    │
│  POST /api/feedback/generate  ──►  Gemini API    │
│  /api/admin/*  (CRUD)         ──►  JSON files    │
└──────────────────────────────────────────────────┘
```

### Voice pipeline (per turn)

```
[Mic] ──► MediaRecorder ──► POST /audio/transcribe (Gemini STT)
                                    │
                                    ▼ user text
                         POST /chat/turn ──► Gemini SSE stream
                                    │           │
                                    │           ▼ token deltas
                                    │     TranscriptPanel (live)
                                    │
                                    ▼ fullText (on stream done)
                         POST /tts/speak ──► Gemini TTS (PCM→WAV)
                                    │
                                    ▼ audio buffer
                         AudioContext ──► playback via Web Audio API
```

Each layer starts as soon as the previous layer produces its first output — STT result triggers the LLM call, and the TTS call is made with the full LLM response once the stream completes.

---

## 3. Tech Stack & Design Decisions

### Frontend

| Package | Version | Why |
|---|---|---|
| React | 19 | Concurrent features simplify streaming state updates |
| TypeScript | 6 | Strict mode catches voice-state bugs at compile time |
| Vite | 8 | Sub-second HMR during development; native ESM |
| React Router | 6 | Client-side routing for Dashboard / Session / Feedback / Admin |
| React Context + useReducer | — | State machine for the session lifecycle; no external store needed |
| Web Audio API | native | Recording, waveform visualisation, TTS chunk playback via AudioContext |

### Backend

| Package | Version | Why |
|---|---|---|
| Express | 5 | Minimal HTTP layer; `res.write()` makes SSE trivial |
| tsx | 4 | Runs TypeScript directly in development — no compile step |
| dotenv | 17 | Loads API keys from `.env` on startup |
| cors | 2 | Allows the Vite dev server (port 5173) to call the API (port 3001) |
| `@google/generative-ai` | latest | Gemini API for STT, LLM (Persona Agent + Coaching Agent), and TTS |
| multer | 1 | Multipart form handling for audio file uploads to the transcribe endpoint |

### Key design decisions

**Single API (Gemini) for all AI tasks**
Gemini Flash handles audio transcription (STT), conversational generation (LLM), and speech synthesis (TTS) — one API key, one SDK. Gemini TTS returns raw 16-bit LE PCM (`audio/L16`); the backend wraps it in a 44-byte WAV header before sending so browsers can decode it with `AudioContext.decodeAudioData()`.

**SSE over WebSockets for LLM streaming**
The LLM call is strictly server-to-client (token deltas). Server-Sent Events are simpler to implement and debug — no upgrade handshake, works through HTTP/2, and the streaming `fetch` API handles it directly.

**Buffer-based SSE parser**
A raw `fetch` stream reader accumulates bytes in a `lineBuffer`, splitting on `\n\n` SSE event boundaries before attempting `JSON.parse`. This prevents silent parse failures when TCP delivers a `data:` line's JSON payload split across multiple reads.

**Two-agent pattern (Persona Agent + Coaching Agent)**
The Persona Agent runs in real time during the session, constrained to stay in character. The Coaching Agent runs once after the session ends with a completely different system prompt, producing structured `FeedbackResult` JSON. Separating them means neither agent's prompt compromises the other's behaviour.

**Push-to-talk as the default input mode**
Hands-free voice detection is unreliable in noisy sales environments and adds latency from false-trigger guards. PTT gives learners intentional, controlled input. Tap-to-record is offered as an alternative; both modes are persisted to `localStorage`.

**JSON flat files for admin data**
Scenarios and personas are stored in `backend/src/data/scenarios.json` and `personas.json`. Reads happen on every request so admin changes are immediately visible in the dashboard — no cache invalidation needed. SQLite can replace this for production.

**Model switcher via localStorage**
`useModelConfig` reads/writes a JSON blob in `localStorage` keyed to `ai-role-player:model-config`. A ref pattern (`llmModelRef.current = llmModel`) is used inside hooks whose callbacks are stable references — they always read the latest selected model without being recreated on every selection change.

**Structured conversation phases in the Persona Agent prompt**
Each persona system prompt includes an explicit phase guide (`Opening → Discovery → Pitch → Objection Handling → Closing`). This reduces hallucinations and keeps sessions relevant to the chosen scenario.

---

## 4. Project Structure

```
ai-role-player/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/       # ScenarioSelector, PersonaSelector, ModelSelector, etc.
│   │   │   ├── session/         # VoicePanel, TranscriptPanel, SessionControls, ErrorToast, etc.
│   │   │   ├── feedback/        # FeedbackSummary, KeyMomentCard, TranscriptViewer, ExportControls
│   │   │   └── admin/           # AdminModal, ScenarioForm, PersonaForm
│   │   ├── context/
│   │   │   └── SessionContext.tsx   # Session state machine (useReducer)
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts      # MediaRecorder + Web Audio API
│   │   │   ├── useAudioPlayer.ts        # TTS playback via AudioContext
│   │   │   ├── useStreamingTranscript.ts  # SSE consumer with buffer-based parser
│   │   │   ├── useModelConfig.ts        # Model selection with localStorage persistence
│   │   │   └── useEarcons.ts            # State-transition audio cues
│   │   ├── pages/               # DashboardPage, SessionPage, FeedbackPage, AdminPage
│   │   ├── services/            # voiceApi, adminApi (fetch wrappers with retry)
│   │   └── types/               # Shared TypeScript interfaces
│   ├── vite.config.ts           # Proxy /api → localhost:3001
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── personaAgent.ts      # Builds prompt + streams Gemini response
│   │   │   └── coachingAgent.ts     # Post-session feedback (structured JSON)
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── audio.ts             # POST /api/audio/transcribe (Gemini STT)
│   │   │   ├── chat.ts              # POST /api/chat/turn (SSE stream)
│   │   │   ├── tts.ts               # POST /api/tts/speak (Gemini TTS → WAV)
│   │   │   ├── feedback.ts          # POST /api/feedback/generate
│   │   │   └── admin.ts             # CRUD /api/admin/scenarios|personas
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── data/
│   │   │   ├── scenarios.json       # Live-editable via Admin Console
│   │   │   └── personas.json
│   │   └── index.ts                 # Express app entry point
│   ├── .env.example
│   └── package.json
│
├── plan/                        # Implementation plan + research docs
├── log/                         # Changelog and gap tracking
└── README.md
```

---

## 5. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 22.x |
| npm | ≥ 10.x |
| Google AI / Gemini API key | [aistudio.google.com](https://aistudio.google.com) |

---

## 6. Setup & Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/sheetstone/ai-role-player
cd ai-role-player
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY
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

The gear icon (⚙) in the top-right corner lets you switch models and access the Admin Console.

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
| `GEMINI_API_KEY` | Yes | Used for STT, LLM (Persona Agent + Coaching Agent), and TTS |
| `GEMINI_MODEL` | No | Default LLM model (default: `gemini-2.5-flash`); overridden per-request by the model switcher |
| `PORT` | No | Backend port (default: `3001`) |

The backend will start but API calls will fail with a clear error if `GEMINI_API_KEY` is missing.

---

## 8. Browser Support

| Browser | Support | Notes |
|---|---|---|
| Chrome 120+ | Full | Primary development target |
| Firefox 120+ | Full | `MediaRecorder` outputs `audio/ogg`; backend accepts it |
| Safari 17+ | Partial | `MediaRecorder` requires `audio/mp4`; a `RecordRTC` polyfill may be needed for older versions |
| Edge 120+ | Full | Chromium-based; same as Chrome |

Voice features require:
- Microphone permission granted by the user
- A secure context (`https://` or `localhost`) — browsers block `getUserMedia` on plain `http://`

---

## 9. Production Deployment

The app ships as three Docker containers managed by Docker Compose: **frontend** (Nginx serving the React build), **backend** (Node.js API), and **Caddy** (automatic HTTPS).

### Infrastructure

| Item | Value |
|---|---|
| Cloud | AWS EC2 |
| Region | `ap-southeast-1` (Singapore) — required, Gemini API is blocked in `ap-east-1` HK |
| Instance | `t3.medium` — 2 vCPU / 4 GB RAM, Ubuntu 22.04 |
| Static IP | AWS Elastic IP |
| TLS | Caddy + [sslip.io](https://sslip.io) (free, no domain purchase needed) |

### First deploy on a new VM

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu && exit   # re-login after

# 2. Clone and configure
git clone https://github.com/sheetstone/ai-role-player.git
cd ai-role-player
cp backend/.env.example backend/.env
nano backend/.env   # fill in GEMINI_API_KEY and CORS_ORIGIN

# 3. Start
docker compose up -d --build
```

### Environment variables (backend/.env)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API key from [aistudio.google.com](https://aistudio.google.com) |
| `GEMINI_MODEL` | No | Default: `gemini-2.0-flash` |
| `PORT` | No | Default: `3001` |
| `NODE_ENV` | No | Set to `production` on the VM |
| `CORS_ORIGIN` | Yes | Must match the live HTTPS URL exactly, e.g. `https://1-2-3-4.sslip.io` |

### Redeploy after code changes

```bash
git pull
docker compose up -d --build
```

### Useful diagnostics

```bash
docker compose ps                 # all three services should show Up
docker compose logs caddy         # confirm TLS cert was obtained
docker compose logs backend       # check for API errors
curl http://localhost/api/health  # quick health check from inside the VM
```

### Changing the IP / domain

1. Update `Caddyfile` — replace the sslip.io hostname with the new one
2. Update `CORS_ORIGIN` in `backend/.env` on the VM
3. `git pull && docker compose up -d --build`
