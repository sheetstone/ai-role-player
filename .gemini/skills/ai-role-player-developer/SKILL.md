---
name: ai-role-player-developer
description: Full-stack development for the AI Role Player project, covering Voice UX, streaming pipelines, and Bento design systems. Use when building or refactoring components related to voice interaction, AI personas, or admin console CRUD.
---

# AI Role Player Development Skill

This skill provides specialized guidance for building the AI Role Player training platform. It covers frontend (React), backend (Node.js), and Voice AI integration.

## Core Expertise

- **Frontend**: React 19, TypeScript, Vanilla CSS (Bento design), Web Audio API.
- **Backend**: Express, SSE (Server-Sent Events), Audio chunking, OpenAI/Anthropic APIs.
- **Voice UX**: Latency management, State Machine logic, Interruption handling.

## Essential Workflows

### 1. Voice UI Implementation
When building recording or playback components, follow the latency and interaction standards:
- See [voice-ux.md](references/voice-ux.md) for latency targets and PTT/Toggle patterns.
- Use `useVoiceRecorder` and `useAudioPlayer` hooks as core abstractions.

### 2. Streaming & Pipeline
For end-to-end turn handling (STT -> LLM -> TTS):
- See [streaming.md](references/streaming.md) for technical implementation of SSE and binary chunks.
- Ensure "Pipeline Parallelism" is implemented to meet the 2.5s TTFA target.

### 3. State Management
The session lifecycle is strictly governed by a 6-state machine:
- See [state-machine.md](references/state-machine.md) for transition rules and action types.
- Ensure all UI indicators react synchronously to `SessionContext` state changes.

### 4. Admin Console & Data
- Scenarios and Personas are stored as JSON files (seed data in `backend/src/data/`).
- CRUD operations must reflect immediately on the dashboard without a rebuild.
- Use atomic file writes to prevent corruption.

## Design Standards (Bento)
- Follow the typography (12/14/16/20/24/32) and spacing (4/8/12/16/24/32) scales in `DESIGN.md`.
- Colors: Primary coral (`#C4784A`), Surface cream (`#FFF5E6`), Text near-black (`#111827`).
- Radius: `sm: 4px`, `md: 8px`.
