# Voice AI UX Research — Lessons from Existing Products
**Version:** v1  
**Date:** 2026-04-27  
**Status:** Reference

---

## Summary Table

| Product | Strength | Weakness | Key Lesson |
|---|---|---|---|
| ChatGPT Advanced Voice | Familiar, widely used | 3–4s lag, forced mode, interrupts user | Latency and forced UX changes kill trust fast |
| Claude Voice | Explicit PTT + hands-free modes | Desktop support still limited | Offering both modes is the right call |
| Gemini Live | Bi-directional streaming, native audio, real interrupt | Complex infra | Native audio gen >> TTS post-processing; real interruption is table-stakes |
| Alexa/Siri/Google | Established state vocabulary | Silent detection creates uncertainty | Always give audible + visual feedback on state transitions |
| Vapi.ai | Ultra-low latency, natural turn-taking, floating widget | Developer-focused docs | Widget model + both voice/text modes = safety net |
| Retell AI | ~600ms latency, structured conversation flows | Enterprise pricing | 600ms is the gold standard; flows beat free-form prompting |
| Bland.ai | Scalable infra | No non-technical UI, no no-code builder | Weakness here is YOUR strength: make admin UI non-developer friendly |

---

## Critical Insight: The 16% Rule

> Each additional second of latency reduces user satisfaction by 16%.

Voice silence = broken call in the user's brain. There is no spinner — silence is ambiguous.

**Targets derived from industry research:**

| Metric | Target | Failure threshold |
|---|---|---|
| Show "Processing…" after recording stops | ≤ 300ms | > 600ms |
| First partial transcript | ≤ 1.5s | > 2.5s |
| First audio chunk from TTS | ≤ 800ms (best effort) | > 2.0s |
| Interruption response (stop playback) | ≤ 200ms | > 500ms |
| Turn detection false positives | < 2 per session | > 5 |

---

## 8 Actionable Lessons for This App

### Lesson 1 — Reduce Perceived Latency Aggressively

- Show a processing indicator within **300ms** — this is a pure UI state flip, not an API call. Do it immediately `onRecordStop`.
- Add **filler phrases** to the persona prompt so the AI says "Let me think about that..." before a long response — 800ms feels like 300ms when something is happening.
- Break TTS into **100–200ms audio chunks** and start playback as the first chunk arrives. Do not wait for the full sentence.
- Add a **subtle audio cue (earcon)** — a soft tone when recording stops and when AI starts speaking. Users tolerate known waits better than silent ones.

### Lesson 2 — Make State Transitions Crystal Clear

- Animated indicator, not a static icon. The waveform/orb must **react to the user's voice in real time** while recording.
- State colors: Listening = red pulse, Processing = yellow/amber spinner, Speaking = blue pulse, Paused = orange, Ended = green.
- State text label always visible ("Listening…", "Processing…", "Speaking…") as a fallback.
- **Never show pure silence during processing.** Always animate something.

### Lesson 3 — Support Real Interruption

- Users must be able to **cut the AI off mid-sentence** (not after it finishes). This is where ChatGPT fails and Gemini succeeds.
- When user starts speaking → stop TTS playback immediately (≤200ms).
- Basic VAD (voice activity detection) alone is not enough — backchannels ("mm-hmm", "yeah") should NOT stop the AI. Use a short hold timer (e.g., 400ms of sustained voice) before treating it as a real interruption.

### Lesson 4 — Two Interaction Modes, Hands-Free as Default

- **Hands-free (default):** Auto-detect speech end by natural pause (350–500ms of silence after voice activity).
- **Push-to-talk (fallback):** For noisy environments. Hold = recording, release = submit.
- Let the user pick the mode on session start, not buried in settings.
- PTT should feel **intentional and controlled** — the most important design decision for a voice sales training context where the learner may be nervous.

### Lesson 5 — Error Recovery That Feels Human

- Confidence cascade:
  - High confidence → act + confirm
  - Medium confidence → "Did you mean…?" with 2–3 options
  - Low confidence → "I didn't catch that, could you rephrase?"
- Never blame the user ("I didn't understand you"). Own the failure: "Let me try that again…"
- After 2 consecutive STT failures → offer to switch to text input as escape hatch.
- Silent retry on transient network/API errors before surfacing to the user.

### Lesson 6 — Structured Conversation Flows Beat Pure Free-Form Prompts

- Do not rely solely on a persona system prompt. Structure the conversation in phases:
  `Opening → Discovery → Pitch → Objection Handling → Closing`
- The LLM persona agent should track which phase it's in and steer naturally.
- This reduces hallucinations and keeps the session relevant to the sales scenario.
- Retell AI (600ms latency) succeeds here precisely because of structured flows.

### Lesson 7 — First-Run Onboarding Matters

- Show a short 30-second guided walkthrough on first session:
  - How to speak (pause = end of turn, or hold button)
  - That the AI may take 1–2 seconds to respond (set expectation)
  - That they can interrupt the AI at any time
  - How to end the session and get feedback
- Users who know the system model tolerate delays better.

### Lesson 8 — Accessible by Default

- Every audio state must have a **visual equivalent** (for hearing-impaired users or noisy offices).
- Live captions of the AI's speech (not just the user's transcript) — show what the AI is saying in text simultaneously.
- Volume control and mute are non-optional.
- All interactive elements must be keyboard accessible.

---

## What ChatGPT Got Wrong (Avoid These)

1. **Forced Advanced Voice Mode as the only option** — always give users a choice or fallback
2. **3–4s response lag** — felt unnatural, reported as the top complaint
3. **Model "personality drift" in voice vs. text** — users felt lied to when custom instructions were parroted back verbatim
4. **No interruption** — users couldn't cut it off, which breaks conversational flow
5. **Feature regression in voice mode** — voice mode had fewer capabilities; users noticed immediately

---

## What to Steal from the Best

- **Gemini Live:** Bi-directional streaming, native audio generation, real interrupt support, emotional tone detection
- **Retell AI:** ~600ms latency target, structured conversation flows
- **Vapi.ai:** Floating widget with voice+text fallback, ultra-low latency turn-taking
- **Siri:** Audible confirmation tone on state transition (always better than silent)
- **Claude:** Explicit PTT + hands-free dual-mode design

---

## Architecture Implication for This App

The key implication: **stream at every layer**, do not do request-response.

```
Browser → WebSocket/SSE → STT stream → LLM token stream → TTS chunk stream → Browser
```

Each hop should start before the previous one finishes. By the time STT has the first word,
the LLM should already be receiving context. By the time LLM has the first sentence,
TTS should already be synthesizing audio.

This pipeline parallelism is the primary lever for hitting sub-2.5s TTFA.

---

## Sources

- ChatGPT Advanced Voice Mode Issues — OpenAI Community Forum
- Claude Voice Mode Help Center — support.claude.com
- Gemini Live API Docs — ai.google.dev
- Vapi.ai Docs & Reviews
- Retell AI Turn-Taking Blog
- Bland.ai Review — synthflow.ai
- Voice AI Latency: The 16% Rule — chanl.ai
- Hamming AI Latency Guide
- Twilio Voice Agent Latency Guide
- LiveKit Adaptive Interruption Handling Blog
- VUI Design Patterns — Toptal, Fuselab Creative, Parallelhq
