import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

initializeApp()
const db = getFirestore()

const scenarios = JSON.parse(await readFile(join(__dirname, '../src/data/scenarios.json'), 'utf-8'))
const personas  = JSON.parse(await readFile(join(__dirname, '../src/data/personas.json'),  'utf-8'))

for (const s of scenarios) {
  await db.doc(`scenarios/${s.id}`).set(s)
  console.log('seeded scenario:', s.id, s.name)
}

for (const p of personas) {
  await db.doc(`personas/${p.id}`).set(p)
  console.log('seeded persona:', p.id, p.name)
}

console.log(`\nDone. Seeded ${scenarios.length} scenarios and ${personas.length} personas.`)
