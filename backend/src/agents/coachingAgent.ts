import { GoogleGenerativeAI } from '@google/generative-ai'
import type { FeedbackResult, KeyMoment, Scenario, Persona, Turn } from '../types/index.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

function buildPrompt(
  turns: Pick<Turn, 'id' | 'speaker' | 'text' | 'timestamp'>[],
  scenario: Scenario,
  persona: Persona,
): string {
  const firstTs = turns[0]?.timestamp ?? 0
  const lastTs = turns[turns.length - 1]?.timestamp ?? 0
  const durationSeconds = Math.round((lastTs - firstTs) / 1000)
  const userTurnCount = turns.filter(t => t.speaker === 'user').length

  const transcript = turns.map((t, i) => {
    const label = t.speaker === 'user' ? 'Learner' : persona.name
    return `[Turn ${i + 1}] [id:${t.id}] ${label}: ${t.text}`
  }).join('\n')

  return `You are an expert sales coach reviewing a training role-play session. Analyze the transcript and provide structured coaching feedback.

SCENARIO: ${scenario.name}
DESCRIPTION: ${scenario.description}
GOALS: ${scenario.goals.join('; ')}
PERSONA: ${persona.name} (${persona.traits.join(', ')})
DIFFICULTY: ${persona.difficulty}

TRANSCRIPT:
${transcript}

Return ONLY valid JSON — no markdown, no code fences, no explanation text before or after.

Schema to follow exactly:
{
  "overallAssessment": "2-3 sentences summarizing the learner's overall performance",
  "strengths": ["specific strength observed", "..."],
  "improvementAreas": ["specific gap observed", "..."],
  "coachingTips": ["actionable, specific tip", "..."],
  "keyMoments": [
    {
      "turnId": "exact id value from [id:...] in transcript",
      "type": "good",
      "label": "3-6 word label",
      "explanation": "specific explanation referencing what was actually said"
    }
  ],
  "metadata": {
    "scenario": "${scenario.name}",
    "persona": "${persona.name}",
    "durationSeconds": ${durationSeconds},
    "turnCount": ${userTurnCount}
  }
}

Requirements:
- overallAssessment: 2-3 sentences only
- strengths: 2-4 items
- improvementAreas: 2-4 items
- coachingTips: 3-5 actionable items
- keyMoments: minimum 3 total, at least 1 "good" and at least 1 "improvement"
- Every turnId must exactly match one of the [id:...] values shown in the transcript
- Reference specific words or phrases the learner used in explanations`
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function parseResponse(text: string): FeedbackResult | null {
  try {
    return JSON.parse(stripFences(text)) as FeedbackResult
  } catch {
    return null
  }
}

function makeFallback(
  turns: Pick<Turn, 'id' | 'speaker' | 'text' | 'timestamp'>[],
  scenario: Scenario,
  persona: Persona,
): FeedbackResult {
  const userTurns = turns.filter(t => t.speaker === 'user')
  const firstTs = turns[0]?.timestamp ?? 0
  const lastTs = turns[turns.length - 1]?.timestamp ?? 0
  const durationSeconds = Math.round((lastTs - firstTs) / 1000)

  const moments: KeyMoment[] = []
  if (userTurns[0]) moments.push({ turnId: userTurns[0].id, type: 'good', label: 'Started the conversation', explanation: 'You opened the dialogue and got the exchange going.' })
  if (userTurns[1]) moments.push({ turnId: userTurns[1].id, type: 'improvement', label: 'Opportunity to probe deeper', explanation: 'This was a good moment to ask a follow-up discovery question.' })
  if (userTurns[2]) moments.push({ turnId: userTurns[2].id, type: 'good', label: 'Maintained engagement', explanation: 'You kept the conversation active and moving forward.' })
  while (moments.length < 3 && userTurns.length > 0) {
    moments.push({ turnId: userTurns[0].id, type: 'good', label: 'Practice moment', explanation: 'Review this turn for self-assessment.' })
  }

  return {
    overallAssessment: 'Feedback generation encountered an issue — please review the transcript below for self-assessment. Keep practicing to build confidence and skill in each conversation phase.',
    strengths: ['You completed a full role-play session.', 'You maintained engagement with the persona throughout.'],
    improvementAreas: ['Focus on asking discovery questions to uncover customer needs.', 'Work on handling objections with empathy before pivoting to solutions.'],
    coachingTips: [
      'Use open-ended questions ("What challenges are you facing with…?") to encourage the customer to share more.',
      'Acknowledge objections before addressing them — "I understand your concern about price…"',
      'Summarize what the customer said before responding to show you\'ve been listening.',
    ],
    keyMoments: moments,
    metadata: { scenario: scenario.name, persona: persona.name, durationSeconds, turnCount: userTurns.length },
  }
}

export async function generateFeedback(
  turns: Pick<Turn, 'id' | 'speaker' | 'text' | 'timestamp'>[],
  scenario: Scenario,
  persona: Persona,
  modelName?: string,
): Promise<FeedbackResult> {
  const resolvedModel = modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const model = genAI.getGenerativeModel({ model: resolvedModel })
  const prompt = buildPrompt(turns, scenario, persona)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseResponse(text)
      if (parsed) return parsed
      console.warn(`[coachingAgent] attempt ${attempt + 1}: JSON parse failed`)
    } catch (err) {
      console.error(`[coachingAgent] attempt ${attempt + 1} error:`, err)
    }
  }

  console.warn('[coachingAgent] both attempts failed — returning fallback feedback')
  return makeFallback(turns, scenario, persona)
}
