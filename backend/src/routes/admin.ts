import { Router } from 'express'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { Scenario, Persona } from '../types/index.js'

const router = Router()
const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')

async function readScenarios(): Promise<Scenario[]> {
  const raw = await readFile(join(dataDir, 'scenarios.json'), 'utf-8')
  return JSON.parse(raw) as Scenario[]
}

async function readPersonas(): Promise<Persona[]> {
  const raw = await readFile(join(dataDir, 'personas.json'), 'utf-8')
  return JSON.parse(raw) as Persona[]
}

router.get('/scenarios', async (_req, res, next) => {
  try {
    const scenarios = await readScenarios()
    res.json(scenarios)
  } catch (err) {
    next(err)
  }
})

router.get('/personas', async (_req, res, next) => {
  try {
    const personas = await readPersonas()
    res.json(personas)
  } catch (err) {
    next(err)
  }
})

export default router
export { readScenarios, readPersonas }
