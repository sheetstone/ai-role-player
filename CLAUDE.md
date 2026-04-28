# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Role Player** is a voice-first web application for sales training. Learners practice customer conversations with AI-simulated personas; admins configure scenarios, personas, and scoring rubrics. This is a case study / MVP — prioritize functional correctness and voice UX quality over visual polish.

## Tech Stack

- **Frontend:** React (TypeScript), Vanilla CSS or lightweight UI library
- **State Management:** React Context for session state
- **Voice/Audio:** Web Audio API (recording + playback), integrated with STT and TTS services
- **Backend:** Node.js (Express) or Python (FastAPI) orchestrating LLM, STT, TTS calls

## Architecture

### Core User Flows

1. **Learner Dashboard** → select scenario + persona + difficulty → "Start Role Play"
2. **Role Play Session** → voice input → STT → LLM → TTS → voice output (looped until session ends)
3. **Feedback Summary** → AI-generated coaching, highlighted transcript moments, export
4. **Admin Console** → CRUD for scenarios/personas, live-reflected in learner dashboard (no rebuild)

### Voice Pipeline

```
[Mic] → [Web Audio API] → [STT service] → [LLM with persona/scenario context] → [TTS service] → [Audio playback]
```

- Show response indicator within **300ms** of recording stop
- First partial transcript within **1.5s**
- Audio playback start within **2.5s**
- UI must never freeze; keep scrolling and cancel actions responsive throughout

### Session State Machine

States: `Idle → Listening → Processing → Speaking → Paused → Ended`

Each state needs a visible indicator in the UI.

### Admin Data Model

Scenarios and personas must support live updates without app rebuild. Key scenario fields: persona compatibility list, success criteria, scoring weights (e.g., Discovery 40% / Closing 30%), voice behavior config (interrupt frequency, pace, tone).

## Key Requirements to Keep in Mind

- Voice input: support both **push-to-talk** (hold) and **tap-to-record** (toggle) modes
- Recording UI: timer + mic icon + live input level meter/waveform
- Must handle mic permission denial with recovery guidance
- AI response playback controls: mute/unmute, volume, stop/skip
- Transcript: real-time streaming, user vs. persona clearly distinguished with timestamps
- Feedback page: ≥3 highlighted "key moments" (good practice + needs improvement), session metadata (scenario, persona, duration, turns), export as .txt/.json
- Robust error handling: service errors, timeouts, empty/malformed responses, audio codec failures

## Development Commands

> Commands will be added here once the project scaffold is initialized (e.g., `npm create vite`, `npx create-react-app`, or equivalent).

Typical expected commands once scaffolded:
```bash
# Frontend
npm install
npm run dev        # start dev server
npm run build      # production build
npm run lint       # lint check
npm run test       # run tests

# Backend
npm install        # or: pip install -r requirements.txt
npm run dev        # or: uvicorn main:app --reload
```
