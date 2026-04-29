import { Router } from 'express'
import type { FeedbackRequest } from '../types/index.js'
import { readScenarios, readPersonas } from './admin.js'
import { generateFeedback } from '../agents/coachingAgent.js'

const router = Router()

router.post('/generate', async (req, res, next) => {
  try {
    const { turns, scenarioId, personaId, llmModel } = req.body as FeedbackRequest & { llmModel?: string }

    if (!Array.isArray(turns) || !scenarioId || !personaId) {
      return res.status(400).json({ error: 'Missing required fields: turns, scenarioId, personaId' })
    }

    const [scenarios, personas] = await Promise.all([readScenarios(), readPersonas()])
    const scenario = scenarios.find(s => s.id === scenarioId)
    const persona = personas.find(p => p.id === personaId)

    if (!scenario) return res.status(400).json({ error: `Scenario not found: ${scenarioId}` })
    if (!persona) return res.status(400).json({ error: `Persona not found: ${personaId}` })

    const feedback = await generateFeedback(turns, scenario, persona, llmModel)
    res.json(feedback)
  } catch (err) {
    next(err)
  }
})

export default router
