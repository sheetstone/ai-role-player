import { Router } from 'express'
import { streamTurn } from '../agents/personaAgent.js'
import { readScenarios, readPersonas } from './admin.js'

const router = Router()

router.post('/turn', async (req, res, next) => {
  try {
    const { personaId, scenarioId, difficulty, history, userText } = req.body

    const [personasData, scenariosData] = await Promise.all([
      readPersonas(),
      readScenarios()
    ])

    const persona = personasData.find((p: Persona) => p.id === personaId)
    const scenario = scenariosData.find((s: Scenario) => s.id === scenarioId)

    if (!persona || !scenario) {
      res.status(404).json({ error: 'Persona or Scenario not found' })
      return
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let fullText = ''
    try {
      const stream = streamTurn(persona, scenario, difficulty, history, userText)
      
      for await (const chunk of stream) {
        fullText += chunk
        res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`)
      }

      res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`)
      res.end()
    } catch (streamError) {
      console.error('Streaming error:', streamError)
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI response failed' })}\n\n`)
      res.end()
    }
  } catch (error) {
    next(error)
  }
})

export default router
