/**
 * Admin Console — CRUD management for scenarios and personas.
 *
 * A tabbed page with two sections: "Scenarios" and "Personas". Each section
 * shows a card list with Edit and Delete buttons. Clicking "New" or "Edit"
 * opens an `AdminModal` containing the relevant form.
 *
 * Delete uses the `useDeleteConfirm` hook so a two-step confirmation replaces
 * the delete button before anything is actually removed.
 *
 * All changes are immediately reflected in the learner dashboard because
 * `DashboardPage` re-fetches data on every mount.
 */
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../services/adminApi'
import { useDeleteConfirm } from '../hooks/useDeleteConfirm'
import type { Scenario, Persona } from '../types'
import AdminModal from '../components/admin/AdminModal'
import ScenarioForm from '../components/admin/ScenarioForm'
import PersonaForm from '../components/admin/PersonaForm'
import styles from './AdminPage.module.css'

type Tab = 'scenarios' | 'personas'
type ScenarioModal = Scenario | 'new' | null
type PersonaModal = Persona | 'new' | null

function DeleteConfirmButtons({ id, deletingId, onConfirm, onCancel, onRequest }: {
  id: string
  deletingId: string | null
  onConfirm: (id: string) => void
  onCancel: () => void
  onRequest: (id: string) => void
}) {
  if (deletingId === id) {
    return (
      <span className={styles.confirmGroup}>
        Delete?
        <button className={styles.confirmYes} onClick={() => onConfirm(id)}>Yes</button>
        <button className={styles.confirmNo} onClick={onCancel}>No</button>
      </span>
    )
  }
  return <button className={styles.deleteBtn} onClick={() => onRequest(id)}>Delete</button>
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('scenarios')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [scenarioModal, setScenarioModal] = useState<ScenarioModal>(null)
  const [personaModal, setPersonaModal] = useState<PersonaModal>(null)

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

  const scenarioDelete = useDeleteConfirm(async (id) => { await adminApi.deleteScenario(id); await load() })
  const personaDelete = useDeleteConfirm(async (id) => { await adminApi.deletePersona(id); await load() })

  const handleSaveScenario = async (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (scenarioModal === 'new') await adminApi.createScenario(data)
    else await adminApi.updateScenario((scenarioModal as Scenario).id, data)
    setScenarioModal(null)
    await load()
  }

  const handleSavePersona = async (data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (personaModal === 'new') await adminApi.createPersona(data)
    else await adminApi.updatePersona((personaModal as Persona).id, data)
    setPersonaModal(null)
    await load()
  }

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
                      <button className={styles.editBtn} onClick={() => { scenarioDelete.setDeletingId(null); setScenarioModal(s) }}>
                        Edit
                      </button>
                      <DeleteConfirmButtons
                        id={s.id}
                        deletingId={scenarioDelete.deletingId}
                        onConfirm={scenarioDelete.handleDelete}
                        onCancel={() => scenarioDelete.setDeletingId(null)}
                        onRequest={scenarioDelete.setDeletingId}
                      />
                    </div>
                  </div>
                ))}
                {scenarios.length === 0 && <p className={styles.empty}>No scenarios yet. Create one to get started.</p>}
              </div>
            </>
          )}

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
                      <button className={styles.editBtn} onClick={() => { personaDelete.setDeletingId(null); setPersonaModal(p) }}>
                        Edit
                      </button>
                      <DeleteConfirmButtons
                        id={p.id}
                        deletingId={personaDelete.deletingId}
                        onConfirm={personaDelete.handleDelete}
                        onCancel={() => personaDelete.setDeletingId(null)}
                        onRequest={personaDelete.setDeletingId}
                      />
                    </div>
                  </div>
                ))}
                {personas.length === 0 && <p className={styles.empty}>No personas yet. Create one to get started.</p>}
              </div>
            </>
          )}

        </section>
      )}

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
