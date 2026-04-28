// ─── Admin data model ────────────────────────────────────────────────────────

export interface ScoringWeight {
  category: string
  weight: number // 0–100; all weights in a scenario must sum to 100
}

export interface VoiceBehavior {
  interruptFrequency: 'low' | 'medium' | 'high'
  speakingPace: 'slow' | 'normal' | 'fast'
  toneStyle: string // e.g. "skeptical", "friendly"
}

export interface Scenario {
  id: string
  name: string
  description: string
  goals: string[]
  suggestedSkillFocus: string
  compatiblePersonaIds: string[]
  scoringWeights: ScoringWeight[]
  voiceBehavior: VoiceBehavior
  createdAt: string
  updatedAt: string
}

export interface Persona {
  id: string
  name: string
  traits: string[]
  behaviorNotes: string
  systemPrompt: string
  difficulty: 'easy' | 'medium' | 'hard'
  voice: string // OpenAI TTS voice: alloy | echo | fable | onyx | nova | shimmer
  createdAt: string
  updatedAt: string
}

// ─── Session ──────────────────────────────────────────────────────────────────

export type SessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'paused'
  | 'ended'

export type Speaker = 'user' | 'persona'

export interface Turn {
  id: string
  speaker: Speaker
  text: string
  audioBlob?: Blob // retained for optional audio export (FP-J07)
  timestamp: number // ms since session start
  partial: boolean // true while streaming
}

export interface Session {
  id: string
  scenario: Scenario
  persona: Persona
  difficulty: 'easy' | 'medium' | 'hard'
  turns: Turn[]
  state: SessionState
  startedAt: number // Date.now()
  endedAt?: number
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface KeyMoment {
  turnId: string
  type: 'good' | 'improvement'
  label: string
  explanation: string
}

export interface FeedbackResult {
  overallAssessment: string
  strengths: string[]
  improvementAreas: string[]
  coachingTips: string[]
  keyMoments: KeyMoment[]
  metadata: {
    scenario: string
    persona: string
    durationSeconds: number
    turnCount: number
  }
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface TranscribeResponse {
  text: string
  confidence?: number
}

export interface ChatTurnRequest {
  personaId: string
  scenarioId: string
  difficulty: 'easy' | 'medium' | 'hard'
  history: { role: 'user' | 'assistant'; content: string }[]
  userText: string
}

export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string }

export interface FeedbackRequest {
  turns: Pick<Turn, 'id' | 'speaker' | 'text' | 'timestamp'>[]
  scenarioId: string
  personaId: string
}

export interface ApiError {
  error: string
  message?: string
}
