import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../services/adminApi'
import type { Scenario, Persona } from '../types'
import AdminModal from '../components/admin/AdminModal'
import ScenarioForm from '../components/admin/ScenarioForm'
import PersonaForm from '../components/admin/PersonaForm'
import styles from './AdminPage.module.css'

type Tab = 'scenarios' | 'personas'
type ScenarioModal = Scenario | 'new' | null
type PersonaModal = Persona | 'new' | null

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('scenarios')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [scenarioModal, setScenarioModal] = useState<ScenarioModal>(null)
  const [personaModal, setPersonaModal] = useState<PersonaModal>(null)
  const [deletingScenario, setDeletingScenario] = useState<string | null>(null)
  const [deletingPersona, setDeletingPersona] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [s, p] = await Promise.all([adminApi.getScenarios(), adminApi.getPersonas()])
      setScenarios(s)
      setPersonas(p)
    } catch {
      setFetchError('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Scenario CRUD ──────────────────────────────────────────────────────────

  const handleSaveScenario = async (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (scenarioModal === 'new') {
      await adminApi.createScenario(data)
    } else {
      await adminApi.updateScenario((scenarioModal as Scenario).id, data)
    }
    setScenarioModal(null)
    await load()
  }

  const handleDeleteScenario = async (id: string) => {
    await adminApi.deleteScenario(id)
    setDeletingScenario(null)
    await load()
  }

  // ── Persona CRUD ───────────────────────────────────────────────────────────

  const handleSavePersona = async (data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (personaModal === 'new') {
      await adminApi.createPersona(data)
    } else {
      await adminApi.updatePersona((personaModal as Persona).id, data)
    }
    setPersonaModal(null)
    await load()
  }

  const handleDeletePersona = async (id: string) => {
    await adminApi.deletePersona(id)
    setDeletingPersona(null)
    await load()
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const diffClass = (d: string) =>
    d === 'easy' ? styles.badgeEasy : d === 'medium' ? styles.badgeMedium : styles.badgeHard

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Console</h1>
          <p className={styles.subtitle}>Manage scenarios and personas</p>
        </div>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
      </header>

      {fetchError && (
        <div className={styles.errorBanner}>
          {fetchError}
          <button onClick={load}>Retry</button>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'scenarios' ? styles.tabActive : ''}`}
          onClick={() => setTab('scenarios')}
        >
          Scenarios
          <span className={styles.tabCount}>{scenarios.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'personas' ? styles.tabActive : ''}`}
          onClick={() => setTab('personas')}
        >
          Personas
          <span className={styles.tabCount}>{personas.length}</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <section className={styles.section}>

          {/* ── Scenarios ─────────────────────────────────────────────── */}
          {tab === 'scenarios' && (
            <>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Scenarios</h2>
                <button className={styles.newBtn} onClick={() => setScenarioModal('new')}>+ New Scenario</button>
              </div>
              <div className={styles.list}>
                {scenarios.map(s => (
                  <div key={s.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <p className={styles.cardName}>{s.name}</p>
                      <p className={styles.cardDesc}>{s.description}</p>
                      <div className={styles.cardTags}>
                        <span className={styles.tag}>{s.goals.length} goals</span>
                        <span className={styles.tag}>{s.compatiblePersonaIds.length} personas</span>
                        <span className={styles.tag}>{s.voiceBehavior.toneStyle || 'no'} tone</span>
                        <span className={styles.tag}>{s.voiceBehavior.speakingPace} pace</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={() => { setDeletingScenario(null); setScenarioModal(s) }}>
                        Edit
                      </button>
                      {deletingScenario === s.id ? (
                        <span className={styles.confirmGroup}>
                          Delete?
                          <button className={styles.confirmYes} onClick={() => handleDeleteScenario(s.id)}>Yes</button>
                          <button className={styles.confirmNo} onClick={() => setDeletingScenario(null)}>No</button>
                        </span>
                      ) : (
                        <button className={styles.deleteBtn} onClick={() => setDeletingScenario(s.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
                {scenarios.length === 0 && <p className={styles.empty}>No scenarios yet. Create one to get started.</p>}
              </div>
            </>
          )}

          {/* ── Personas ──────────────────────────────────────────────── */}
          {tab === 'personas' && (
            <>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Personas</h2>
                <button className={styles.newBtn} onClick={() => setPersonaModal('new')}>+ New Persona</button>
              </div>
              <div className={styles.list}>
                {personas.map(p => (
                  <div key={p.id} className={styles.card}>
                    <div className={styles.cardBody}>
                      <div className={styles.cardNameRow}>
                        <p className={styles.cardName}>{p.name}</p>
                        <span className={`${styles.diffBadge} ${diffClass(p.difficulty)}`}>{p.difficulty}</span>
                      </div>
                      <p className={styles.cardDesc}>{p.behaviorNotes}</p>
                      <div className={styles.cardTags}>
                        {p.traits.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                        <span className={styles.tag}>voice: {p.voice}</span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={() => { setDeletingPersona(null); setPersonaModal(p) }}>
                        Edit
                      </button>
                      {deletingPersona === p.id ? (
                        <span className={styles.confirmGroup}>
                          Delete?
                          <button className={styles.confirmYes} onClick={() => handleDeletePersona(p.id)}>Yes</button>
                          <button className={styles.confirmNo} onClick={() => setDeletingPersona(null)}>No</button>
                        </span>
                      ) : (
                        <button className={styles.deleteBtn} onClick={() => setDeletingPersona(p.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
                {personas.length === 0 && <p className={styles.empty}>No personas yet. Create one to get started.</p>}
              </div>
            </>
          )}

        </section>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {scenarioModal !== null && (
        <AdminModal
          title={scenarioModal === 'new' ? 'New Scenario' : `Edit: ${(scenarioModal as Scenario).name}`}
          onClose={() => setScenarioModal(null)}
        >
          <ScenarioForm
            initial={scenarioModal === 'new' ? undefined : scenarioModal as Scenario}
            personas={personas}
            onSave={handleSaveScenario}
            onCancel={() => setScenarioModal(null)}
          />
        </AdminModal>
      )}

      {personaModal !== null && (
        <AdminModal
          title={personaModal === 'new' ? 'New Persona' : `Edit: ${(personaModal as Persona).name}`}
          onClose={() => setPersonaModal(null)}
        >
          <PersonaForm
            initial={personaModal === 'new' ? undefined : personaModal as Persona}
            onSave={handleSavePersona}
            onCancel={() => setPersonaModal(null)}
          />
        </AdminModal>
      )}
    </main>
  )
}
