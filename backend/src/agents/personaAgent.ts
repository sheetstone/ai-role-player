import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Persona, Scenario, Turn } from '../types/index.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function* streamTurn(
  persona: Persona,
  scenario: Scenario,
  difficulty: string,
  history: Turn[],
  userText: string,
  modelName?: string,
) {
  const resolvedModel = modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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

  const modelWithSystem = genAI.getGenerativeModel({
    model: resolvedModel,
    systemInstruction: systemPrompt,
  })

  const chat = modelWithSystem.startChat({
    history: history
      .filter(t => !t.partial)
      .map(turn => ({
        role: turn.speaker === 'user' ? 'user' : 'model',
        parts: [{ text: turn.text }],
      })),
    generationConfig: { maxOutputTokens: 1000 },
  })

  const streamingResult = await chat.sendMessageStream(userText)

  let agentFullText = ''
  let chunkCount = 0
  for await (const chunk of streamingResult.stream) {
    chunkCount++
    const chunkText = chunk.text()
    console.log(`[personaAgent] chunk ${chunkCount}:`, JSON.stringify(chunkText))
    if (chunkText) {
      agentFullText += chunkText
      yield chunkText
    }
  }
  const finalResponse = await streamingResult.response
  console.log('[personaAgent] finishReason:', finalResponse.candidates?.[0]?.finishReason)
  console.log('[personaAgent] response.text():', JSON.stringify(finalResponse.text()))
  console.log('[personaAgent] accumulated text:', JSON.stringify(agentFullText))
}
