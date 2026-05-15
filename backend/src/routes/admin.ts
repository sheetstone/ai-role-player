import { Router } from 'express'
import { db } from '../lib/db.js'
import type { Scenario, Persona } from '../types/index.js'

const router = Router()
const scenariosCol = db.collection('scenarios')
const personasCol = db.collection('personas')

// ── Scenarios ──────────────────────────────────────────────────────────────────

router.get('/scenarios', async (_req, res, next) => {
  try {
    const snap = await scenariosCol.orderBy('createdAt').get()
    res.json(snap.docs.map(d => d.data() as Scenario))
  } catch (err) { next(err) }
})

router.post('/scenarios', async (req, res, next) => {
  try {
    const now = new Date().toISOString()
    const docRef = scenariosCol.doc()
    const created: Scenario = { ...req.body, id: docRef.id, createdAt: now, updatedAt: now }
    await docRef.set(created)
    res.status(201).json(created)
  } catch (err) { next(err) }
})

router.put('/scenarios/:id', async (req, res, next) => {
  try {
    const docRef = scenariosCol.doc(req.params.id)
    const snap = await docRef.get()
    if (!snap.exists) { res.status(404).json({ error: 'Not found' }); return }
    const updated: Scenario = { ...snap.data() as Scenario, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() }
    await docRef.set(updated)
    res.json(updated)
  } catch (err) { next(err) }
})

router.delete('/scenarios/:id', async (req, res, next) => {
  try {
    const docRef = scenariosCol.doc(req.params.id)
    const snap = await docRef.get()
    if (!snap.exists) { res.status(404).json({ error: 'Not found' }); return }
    await docRef.delete()
    res.status(204).end()
  } catch (err) { next(err) }
})

// ── Personas ───────────────────────────────────────────────────────────────────

router.get('/personas', async (_req, res, next) => {
  try {
    const snap = await personasCol.orderBy('createdAt').get()
    res.json(snap.docs.map(d => d.data() as Persona))
  } catch (err) { next(err) }
})

router.post('/personas', async (req, res, next) => {
  try {
    const now = new Date().toISOString()
    const docRef = personasCol.doc()
    const created: Persona = { ...req.body, id: docRef.id, createdAt: now, updatedAt: now }
    await docRef.set(created)
    res.status(201).json(created)
  } catch (err) { next(err) }
})

router.put('/personas/:id', async (req, res, next) => {
  try {
    const docRef = personasCol.doc(req.params.id)
    const snap = await docRef.get()
    if (!snap.exists) { res.status(404).json({ error: 'Not found' }); return }
    const updated: Persona = { ...snap.data() as Persona, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() }
    await docRef.set(updated)
    res.json(updated)
  } catch (err) { next(err) }
})

router.delete('/personas/:id', async (req, res, next) => {
  try {
    const docRef = personasCol.doc(req.params.id)
    const snap = await docRef.get()
    if (!snap.exists) { res.status(404).json({ error: 'Not found' }); return }
    await docRef.delete()
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router

/** @deprecated use Firestore directly — kept for any callers during migration */
export async function readScenarios(): Promise<Scenario[]> {
  const snap = await scenariosCol.orderBy('createdAt').get()
  return snap.docs.map(d => d.data() as Scenario)
}

/** @deprecated use Firestore directly — kept for any callers during migration */
export async function readPersonas(): Promise<Persona[]> {
  const snap = await personasCol.orderBy('createdAt').get()
  return snap.docs.map(d => d.data() as Persona)
}
