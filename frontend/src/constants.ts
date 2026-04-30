/**
 * Application-wide constants. All magic numbers, localStorage keys, timeouts,
 * and model options live here. Never inline these values in components or hooks.
 *
 * If you add a new timeout, threshold, or key: put it here first, then import it.
 */

// ── Timeouts ──────────────────────────────────────────────────────────────────
/** How long to wait for the LLM to send its first token before giving up (ms). */
export const LLM_FIRST_TOKEN_TIMEOUT_MS = 8_000
/** How long to wait for the TTS endpoint to respond before giving up (ms). */
export const TTS_RESPONSE_TIMEOUT_MS = 10_000
/** How long an auto-dismiss toast stays on screen (ms). */
export const TOAST_AUTO_DISMISS_MS = 6_000
/** How long the "✓ Copied!" confirmation shows on the copy button (ms). */
export const COPY_FEEDBACK_TIMEOUT_MS = 2_000

// ── Recording ─────────────────────────────────────────────────────────────────
/** Recording auto-stops after this many seconds to prevent runaway captures. */
export const RECORDING_MAX_SECONDS = 30
/** Taps shorter than this are treated as accidental and ignored (shows "Hold to record" toast). */
export const RECORDING_SHORT_TAP_MS = 200

// ── Session ───────────────────────────────────────────────────────────────────
/** After this many consecutive STT failures, the text fallback input is shown. */
export const STT_FAILURES_BEFORE_FALLBACK = 2
/** If the user is within this many pixels of the bottom, the transcript auto-scrolls. */
export const TRANSCRIPT_SCROLL_PIN_THRESHOLD_PX = 100

// ── Dashboard ────────────────────────────────────────────────────────────────
/** Maximum number of quick-select pill buttons shown in ScenarioSelector and PersonaSelector. */
export const DASHBOARD_MAX_PILLS = 10

// ── localStorage keys ────────────────────────────────────────────────────────
/** Key for storing the user's preferred recording mode ('ptt' or 'toggle'). */
export const LS_RECORD_MODE = 'ai-role-player:record-mode'
/** Key for storing the user's preferred LLM and TTS model selection as JSON. */
export const LS_MODEL_CONFIG = 'ai-role-player:model-config'
/** Key for storing whether the user has seen the onboarding overlay (set to '1' after first dismiss). */
export const LS_ONBOARDING = 'ai-role-player:onboarding-seen'

// ── Model options ─────────────────────────────────────────────────────────────
export const LLM_OPTIONS = [
  { label: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash' },
  { label: 'Gemini 2.5 Flash Lite', id: 'gemini-2.5-flash-lite' },
  { label: 'Gemini 3 Flash', id: 'gemini-3-flash-preview' },
  { label: 'Gemini 3.1 Flash Lite', id: 'gemini-3.1-flash-lite-preview' },
] as const

export const TTS_OPTIONS = [
  { label: '2.5 Flash TTS', id: 'gemini-2.5-flash-preview-tts' },
  { label: '3.1 Flash TTS', id: 'gemini-3.1-flash-tts-preview' },
] as const

// ── Persona voice options ─────────────────────────────────────────────────────
export const PERSONA_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const
