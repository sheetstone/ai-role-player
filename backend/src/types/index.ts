// ─── Admin data model ────────────────────────────────────────────────────────

export interface ScoringWeight {
  category: string
  weight: number
}

export interface VoiceBehavior {
  interruptFrequency: 'low' | 'medium' | 'high'
  speakingPace: 'slow' | 'normal' | 'fast'
  toneStyle: string
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
  voice: string
  createdAt: string
  updatedAt: string
}

// ─── Session / turn (mirrored from frontend, minus browser-only fields) ───────

export type Speaker = 'user' | 'persona'

export interface Turn {
  id: string
  speaker: Speaker
  text: string
  timestamp: number
  partial: boolean
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

// ─── API request / response shapes ───────────────────────────────────────────

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
  turns: Turn[]
  scenarioId: string
  personaId: string
}
