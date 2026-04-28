import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Persona, Scenario, Turn } from '../types/index.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function* streamTurn(
  persona: Persona,
  scenario: Scenario,
  difficulty: string,
  history: Turn[],
  userText: string
) {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const model = genAI.getGenerativeModel({ model: modelName })

  const systemPrompt = `
You are playing a customer persona in a sales training simulation.

PERSONA IDENTITY:
Name: ${persona.name}
Traits: ${persona.traits.join(', ')}
Behavior Notes: ${persona.behaviorNotes}
Core Character Prompt: ${persona.systemPrompt}

SCENARIO CONTEXT:
Scenario: ${scenario.name}
Description: ${scenario.description}
Goals: ${scenario.goals.join(', ')}
Voice Behavior: Pace: ${scenario.voiceBehavior.speakingPace}, Tone: ${scenario.voiceBehavior.toneStyle}

DIFFICULTY LEVEL: ${difficulty}
(Adjust your resistance and skepticism based on this level. Hard = very resistant, Easy = more agreeable)

CONVERSATION PHASE GUIDE:
1. Opening: Start guarded if appropriate.
2. Discovery: Challenge their understanding.
3. Pitch: Question benefit claims.
4. Objection Handling: Raise concerns (price, competitors).
5. Closing: Only agree if convinced.

INSTRUCTIONS:
- Respond in character at all times.
- Keep responses concise (1-3 sentences max) to maintain conversational flow.
- Use natural spoken language.
- If you need to think, use filler phrases like "Let me see..." or "That's an interesting point..." sparingly.
- NEVER break character.
- NEVER mention you are an AI.
`

  const chat = model.startChat({
    history: history.map(turn => ({
      role: turn.speaker === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }]
    })),
    generationConfig: {
      maxOutputTokens: 200,
    },
  })

  // Gemini doesn't have a direct "system instructions" in the standard chat history in the same way Claude does for every message, 
  // but we can prepend the system prompt to the first message or use the dedicated systemInstruction parameter if supported by this SDK version.
  // For simplicity and compatibility, we'll use a model initialized with system instructions.
  const modelWithSystem = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemPrompt 
  })

  const streamingResult = await modelWithSystem.generateContentStream(userText)

  for await (const chunk of streamingResult.stream) {
    const chunkText = chunk.text()
    if (chunkText) {
      yield chunkText
    }
  }
}
