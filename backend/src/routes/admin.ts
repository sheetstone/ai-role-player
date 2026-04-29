import { Router } from 'express'
import { readFile, writeFile } from 'fs/promises'
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

async function writeScenarios(data: Scenario[]): Promise<void> {
  await writeFile(join(dataDir, 'scenarios.json'), JSON.stringify(data, null, 2), 'utf-8')
}

async function writePersonas(data: Persona[]): Promise<void> {
  await writeFile(join(dataDir, 'personas.json'), JSON.stringify(data, null, 2), 'utf-8')
}

// ── Scenarios ──────────────────────────────────────────────────────────────────

router.get('/scenarios', async (_req, res, next) => {
  try { res.json(await readScenarios()) } catch (err) { next(err) }
})

router.post('/scenarios', async (req, res, next) => {
  try {
    const scenarios = await readScenarios()
    const now = new Date().toISOString()
    const created: Scenario = { ...req.body, id: `scenario-${Date.now()}`, createdAt: now, updatedAt: now }
    await writeScenarios([...scenarios, created])
    res.status(201).json(created)
  } catch (err) { next(err) }
})

router.put('/scenarios/:id', async (req, res, next) => {
  try {
    const scenarios = await readScenarios()
    const idx = scenarios.findIndex(s => s.id === req.params.id)
    if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
    const updated: Scenario = { ...scenarios[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() }
    scenarios[idx] = updated
    await writeScenarios(scenarios)
    res.json(updated)
  } catch (err) { next(err) }
})

router.delete('/scenarios/:id', async (req, res, next) => {
  try {
    const scenarios = await readScenarios()
    const filtered = scenarios.filter(s => s.id !== req.params.id)
    if (filtered.length === scenarios.length) { res.status(404).json({ error: 'Not found' }); return }
    await writeScenarios(filtered)
    res.status(204).end()
  } catch (err) { next(err) }
})

// ── Personas ───────────────────────────────────────────────────────────────────

router.get('/personas', async (_req, res, next) => {
  try { res.json(await readPersonas()) } catch (err) { next(err) }
})

router.post('/personas', async (req, res, next) => {
  try {
    const personas = await readPersonas()
    const now = new Date().toISOString()
    const created: Persona = { ...req.body, id: `persona-${Date.now()}`, createdAt: now, updatedAt: now }
    await writePersonas([...personas, created])
    res.status(201).json(created)
  } catch (err) { next(err) }
})

router.put('/personas/:id', async (req, res, next) => {
  try {
    const personas = await readPersonas()
    const idx = personas.findIndex(p => p.id === req.params.id)
    if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
    const updated: Persona = { ...personas[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() }
    personas[idx] = updated
    await writePersonas(personas)
    res.json(updated)
  } catch (err) { next(err) }
})

router.delete('/personas/:id', async (req, res, next) => {
  try {
    const personas = await readPersonas()
    const filtered = personas.filter(p => p.id !== req.params.id)
    if (filtered.length === personas.length) { res.status(404).json({ error: 'Not found' }); return }
    await writePersonas(filtered)
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router
export { readScenarios, readPersonas }
