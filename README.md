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
         ┌──────────────────┴──────────────────┐
         │  Firebase Hosting (CDN)              │
         │  Static SPA  ──► frontend/dist/      │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │  Firebase App Hosting (Cloud Run)    │
         │  Node.js / Express 5                 │
         │                                      │
         │  POST /api/audio/transcribe  → Gemini STT  │
         │  POST /api/chat/turn (SSE)   → Gemini LLM  │
         │  POST /api/tts/speak         → Gemini TTS  │
         │  POST /api/feedback/generate → Gemini LLM  │
         │  /api/admin/*  (CRUD)        → Firestore   │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │  Firestore                           │
         │  scenarios / personas collections   │
         └─────────────────────────────────────┘
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
| tsx | 4 | Runs TypeScript directly — no compile step needed in Cloud Run |
| firebase-admin | 13 | Firestore SDK for server-side CRUD; uses Application Default Credentials automatically on Cloud Run |
| `@google/generative-ai` | latest | Gemini API for STT, LLM (Persona Agent + Coaching Agent), and TTS |
| multer | 2 | Multipart form handling for audio uploads; temp files written to `/tmp/uploads/` |

### Infrastructure

| Service | Role |
|---|---|
| Firebase Hosting | Serves the React SPA from CDN; global edge delivery |
| Firebase App Hosting | Runs the Express backend on Cloud Run; scales to zero when idle |
| Firestore | Stores scenarios and personas; 50K free reads/day covers MVP traffic |
| Secret Manager | Stores `GEMINI_API_KEY`; injected into Cloud Run at deploy time |
| GitHub Actions | Builds and deploys the frontend on push to `production` |

### Key design decisions

**Single AI provider (Gemini) for STT + LLM + TTS**
One API key, one SDK, one billing account. Gemini Flash supports audio input natively for STT; Gemini TTS voices are sufficient quality for training simulations. Gemini TTS returns raw 16-bit LE PCM (`audio/L16`); the backend wraps it in a 44-byte WAV header before sending so browsers can decode it with `AudioContext.decodeAudioData()`.

**SSE over WebSockets for LLM streaming**
The LLM call is strictly server-to-client (token deltas only). Server-Sent Events are simpler to implement and debug — no upgrade handshake, works through HTTP/2, and the streaming `fetch` API handles it directly. A raw `fetch` stream reader accumulates bytes in a `lineBuffer`, splitting on `\n\n` SSE event boundaries before attempting `JSON.parse`. This prevents silent parse failures when TCP delivers a `data:` line split across multiple reads.

**Two-agent pattern (Persona Agent + Coaching Agent)**
The Persona Agent runs in real time during the session, constrained to stay in character, producing short spoken replies (1–3 sentences). The Coaching Agent runs once after the session ends with a completely different system prompt, producing structured `FeedbackResult` JSON. Separating them means neither agent's prompt compromises the other's behaviour.

**Push-to-talk as the default input mode**
Voice activity detection is unreliable in noisy sales environments and adds latency from false-trigger guards. PTT gives learners intentional, controlled input. Tap-to-record is offered as an alternative; both modes are persisted to `localStorage`.

**Session state machine (explicit states)**
Voice UX has many concurrent concerns (recording, network, audio playback, UI). Implicit boolean flags (`isRecording`, `isLoading`, `isPlaying`) create impossible state combinations. An explicit `useReducer` state machine (`idle → listening → processing → speaking → paused → ended`) makes illegal states unrepresentable.

**Firestore for admin data**
Scenarios and personas are stored as Firestore documents. Reads happen on every request so admin changes are immediately visible in the dashboard — no cache invalidation needed. Individual document writes replace full-array rewrites, making concurrent admin edits safe. The free tier (50K reads/day, 20K writes/day) covers MVP traffic with no cost.

**tsx as the Cloud Run runtime**
Firebase App Hosting runs `npm ci` with `NODE_ENV=production`, which skips `devDependencies` — making `tsc` unavailable. Using `tsx` as the runtime (TypeScript executed directly via esbuild) avoids any compile step in the cloud, keeping the deploy pipeline simple.

**Model switcher via localStorage**
A ref pattern (`llmModelRef.current = llmModel`) is used inside hooks whose callbacks are stable references — they always read the latest selected model without being recreated on every selection change. `localStorage` means the selection survives page refreshes without a backend round-trip.

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
│   │   │   ├── admin/           # AdminModal, ScenarioForm, PersonaForm
│   │   │   └── ui/              # Icon.tsx (shared SVG icons)
│   │   ├── context/
│   │   │   └── SessionContext.tsx   # Session state machine (useReducer)
│   │   ├── hooks/
│   │   │   ├── useVoiceRecorder.ts
│   │   │   ├── useAudioPlayer.ts
│   │   │   ├── useStreamingTranscript.ts
│   │   │   ├── useModelConfig.ts
│   │   │   └── useEarcons.ts
│   │   ├── pages/               # DashboardPage, SessionPage, FeedbackPage, AdminPage
│   │   ├── services/
│   │   │   ├── api.ts           # BASE_URL + request/retryRequest/retryFetch helpers
│   │   │   ├── voiceApi.ts      # STT, chat, TTS, feedback endpoints
│   │   │   └── adminApi.ts      # Scenario/persona CRUD
│   │   └── types/               # Shared TypeScript interfaces
│   ├── .env.production          # VITE_API_URL (App Hosting backend URL)
│   ├── vite.config.ts           # Proxies /api → localhost:3001 in dev
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── personaAgent.ts      # Builds prompt + streams Gemini response
│   │   │   └── coachingAgent.ts     # Post-session feedback (structured JSON)
│   │   ├── lib/
│   │   │   └── db.ts                # Firestore singleton (applicationDefault)
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── audio.ts             # POST /api/audio/transcribe
│   │   │   ├── chat.ts              # POST /api/chat/turn (SSE)
│   │   │   ├── tts.ts               # POST /api/tts/speak
│   │   │   ├── feedback.ts          # POST /api/feedback/generate
│   │   │   └── admin.ts             # CRUD /api/admin/scenarios|personas → Firestore
│   │   ├── data/
│   │   │   ├── scenarios.json       # Seed data (source of truth for re-seeding)
│   │   │   └── personas.json
│   │   └── index.ts
│   ├── scripts/
│   │   └── seedFirestore.ts         # One-time seed: JSON → Firestore
│   ├── apphosting.yaml              # Cloud Run config (minInstances: 0, secret refs)
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy.yml               # Build React + deploy to Firebase Hosting
│       └── check-release-branch.yml # Blocks PRs to production not from release/*
│
├── firebase.json                    # Hosting config (public: frontend/dist)
├── firestore.rules                  # Firestore security rules
├── firestore.indexes.json
└── README.md
```

---

## 5. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 20.x |
| npm | ≥ 10.x |
| Firebase CLI | latest (`npm install -g firebase-tools`) |
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
```

### 3. Start the Firestore emulator (terminal 1)

```bash
# From project root
firebase emulators:start --only firestore
# Emulator UI at http://localhost:4000
# Firestore at 127.0.0.1:8080 (backend/.env already points here)
```

### 4. Start the backend (terminal 2)

```bash
cd backend
npm run dev
# Express running at http://localhost:3001
# Reads/writes go to the local Firestore emulator
```

### 5. Seed the emulator with sample data (first time only)

```bash
cd backend
npm run dev   # must be running so db.ts initialises
# In a separate tab:
npx tsx scripts/seedFirestore.ts
# Check http://localhost:4000 to verify data appeared
```

### 6. Start the frontend (terminal 3)

```bash
cd frontend
npm install
npm run dev
# Vite dev server at http://localhost:5173
# /api/* proxied to localhost:3001 automatically
```

### Useful commands

| Command | Location | What it does |
|---|---|---|
| `npm run dev` | `frontend/` | Start Vite dev server with HMR |
| `npm run build` | `frontend/` | Production build to `frontend/dist/` |
| `npm run lint` | `frontend/` | ESLint check |
| `npm run dev` | `backend/` | Start Express with `tsx watch` (auto-restart on save) |
| `npm run typecheck` | `backend/` | TypeScript type check without emitting |

---

## 7. Environment Variables

All variables are set in `backend/.env` (copy from `backend/.env.example`).

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Used for STT, LLM, and TTS. In production, injected from Secret Manager. |
| `GEMINI_MODEL` | No | Default LLM model (default: `gemini-2.5-flash`) |
| `PORT` | No | Backend port (default: `3001`) |
| `CORS_ORIGIN` | No | Allowed origin for CORS (default: `http://localhost:5173`). In production, set to the Firebase Hosting URL. |
| `FIRESTORE_EMULATOR_HOST` | Dev only | Set to `127.0.0.1:8080` to use the local Firestore emulator instead of production Firestore. |

---

## 8. Browser Support

| Browser | Support | Notes |
|---|---|---|
| Chrome 120+ | Full | Primary development target |
| Firefox 120+ | Full | `MediaRecorder` outputs `audio/ogg`; backend accepts it |
| Safari 17+ | Partial | `MediaRecorder` requires `audio/mp4` |
| Edge 120+ | Full | Chromium-based; same as Chrome |

Voice features require microphone permission and a secure context (`https://` or `localhost`).

---

## 9. Production Deployment

The app runs on Firebase — no servers to manage, scales to zero when idle.

### Infrastructure

| Component | Service | URL |
|---|---|---|
| Frontend SPA | Firebase Hosting (CDN) | `https://ai-role-player.web.app` |
| Backend API | Firebase App Hosting (Cloud Run) | `https://ai-role-player-backend--ai-role-player.us-central1.hosted.app` |
| Database | Firestore | `ai-role-player` project, `(default)` database |
| API Key | Google Secret Manager | Secret: `GEMINI_API_KEY` |

### Deploy workflow

Deployments are triggered by merging a `release/*` PR into `production`:

```
main ──► release/x.x ──► PR to production ──► approval ──► merge
                                                              │
                                     ┌────────────────────────┤
                                     │                        │
                              GitHub Actions            App Hosting
                          (build + deploy frontend)  (auto-deploys backend)
```

- **Frontend**: GitHub Actions runs `npm run build` in `frontend/` then deploys to Firebase Hosting via `FirebaseExtended/action-hosting-deploy`.
- **Backend**: Firebase App Hosting watches the `production` branch and auto-deploys the Express API on every push — no CI step needed.

### Branch protection

- `main` — direct commits allowed (owner only); no force-push; no deletion
- `production` — PRs only; source branch must be `release/*`; 1 approval required; no bypass

### Required GitHub Secret

| Secret | Where to get it |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project settings → Service accounts → Generate new private key |

### Re-seeding Firestore

If scenario/persona data is lost, re-run the seed script with a service account key:

```bash
cd backend
GOOGLE_APPLICATION_CREDENTIALS=../serviceAccount.json npx tsx scripts/seedFirestore.ts
```

> `serviceAccount.json` is gitignored — never commit it.

### Manual frontend deploy (if CI is down)

```bash
cd frontend && npm run build
firebase deploy --only hosting --project ai-role-player
```
