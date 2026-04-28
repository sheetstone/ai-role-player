# Requirement Document: AI Role Player – Voice-Based Customer Sales Skills

## 1. Project Overview
The **AI Role Player** is a web-based training platform designed to help sales teams practice customer conversations through voice-first interactive simulations. The application uses AI to simulate various customer personas and scenarios, providing a safe and scalable environment for skill development.

## 2. Target Users
- **Learners (Sales Representatives):** Practice sales skills, handle objections, and receive AI-driven feedback.
- **Admins (Sales Managers/Coaches):** Create and manage scenarios, personas, and scoring rubrics.

## 3. Functional Requirements

### 3.1 Learner Dashboard
- **Scenario Selection:** Searchable drop-down to select role-play scenarios (e.g., price objections, upsells).
- **Persona Selection:** Searchable drop-down to select AI customer personas (e.g., skeptical, rushed, friendly).
- **Difficulty Selection:** Options for Easy, Medium, and Hard.
- **Summary View:** Display scenario goals, persona traits, and suggested skill focus.
- **Action:** Single "Start Role Play" button to initiate the session.

### 3.2 Role Play Session (Voice-First UI)
- **Interaction Panel:**
    - **Voice Input:** Support for Push-to-talk (hold) or Tap-to-record (toggle).
    - **Recording Indicator:** Timer, microphone icon, and live input level meter/waveform.
    - **Controls:** Cancel recording, pause, end, or restart session.
- **Transcript Panel:**
    - Real-time, streaming text updates for both user and AI.
    - Clear distinction between user and persona with timestamps.
- **AI Feedback/Response:**
    - Audio playback of AI responses.
    - Playback controls: Mute/unmute, volume, and stop/skip.
- **Session States:** Visual indicators for Listening, Processing, Speaking, Paused, and Ended.
- **Robustness:** Graceful handling of microphone permissions, service errors, timeouts, and malformed payloads.

### 3.3 Coaching & Feedback Summary
- **Performance Assessment:** High-level summary of strengths and areas for improvement.
- **Actionable Tips:** Specific coaching advice based on the session.
- **Transcript Review:** Full scrollable transcript with highlighted "Key Moments" (good practice vs. improvement needed).
- **Session Metadata:** Display scenario, persona, duration, and number of turns.
- **Exporting:** Copy transcript to clipboard or download as .txt/.json.

### 3.4 Admin Console
- **Management:** CRUD (Create, Read, Update, Delete) operations for scenarios and personas.
- **Scenario Configuration:**
    - Define persona compatibility.
    - Set success criteria and scoring weights (e.g., Discovery 40%, Closing 30%).
    - Configure voice behavior (interrupt frequency, pace, tone).
- **Validation & Preview:** Input validation and ability to preview persona prompts/behavior.
- **Live Updates:** Changes must reflect in the Learner Dashboard immediately without rebuild.

## 4. Non-Functional Requirements
- **Low Latency:**
    - Response indicator within **300ms** of stopping recording.
    - Partial transcript within **1.5s**.
    - AI speech playback start within **2.5s** (best effort for real models).
- **Performance:** Smooth UI that remains responsive during processing.
- **Accessibility:** Clear guidance for microphone setup and error recovery.

## 5. Technical Stack (Proposed)
- **Frontend:** React (TypeScript) with Vanilla CSS or a lightweight UI library.
- **State Management:** React Context or a simple store for session state.
- **Voice/Audio:** Web Audio API for recording and playback; integration with STT (Speech-to-Text) and TTS (Text-to-Speech) services.
- **Backend:** Node.js (Express) or Python (FastAPI) to orchestrate AI model calls (LLM, STT, TTS).

## 6. Deliverables
- Fully functional working demo.
- Source code (GitHub or compressed folder).
- Technical documentation (Architecture, Design Decisions, Setup Guide).
