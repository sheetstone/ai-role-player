import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../services/adminApi'
import { useSession, SESSION_ACTIONS } from '../context/SessionContext'
import ScenarioSelector from '../components/dashboard/ScenarioSelector'
import PersonaSelector from '../components/dashboard/PersonaSelector'
import DifficultySelector from '../components/dashboard/DifficultySelector'
import SessionSummaryCard from '../components/dashboard/SessionSummaryCard'
import OnboardingOverlay from '../components/dashboard/OnboardingOverlay'
import type { Scenario, Persona, Session } from '../types'
import { LS_ONBOARDING } from '../constants'
import styles from './DashboardPage.module.css'

/**
 * The landing page where learners configure and launch a role-play session.
 *
 * On mount, fetches the latest scenarios and personas from the backend so any
 * admin changes are immediately visible without a page reload.
 *
 * Flow:
 * 1. User selects a scenario, compatible persona, and difficulty level
 * 2. The "Start Role Play" button becomes active when both are selected
 * 3. First-time users see an `OnboardingOverlay` with usage tips
 * 4. On confirm, dispatches `START_SESSION` to the context and navigates to `/session`
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { dispatch } = useSession()

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [difficulty, setDifficulty] = useState<Session['difficulty']>('medium')

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pendingStart, setPendingStart] = useState(false)

  // Fetch fresh data on every mount so admin changes are reflected immediately
  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    Promise.all([adminApi.getScenarios(), adminApi.getPersonas()])
      .then(([s, p]) => { setScenarios(s); setPersonas(p) })
      .catch(() => setFetchError('Failed to load scenarios and personas.'))
      .finally(() => setLoading(false))
  }, [])

  // Clear persona selection when scenario changes (compatibility may differ)
  const handleScenarioSelect = (s: Scenario | null) => {
    setSelectedScenario(s)
    setSelectedPersona(null)
  }

  const canStart = selectedScenario !== null && selectedPersona !== null

  const handleStart = () => {
    if (!canStart) return
    const seen = localStorage.getItem(LS_ONBOARDING)
    if (!seen) {
      setPendingStart(true)
      setShowOnboarding(true)
    } else {
      launchSession()
    }
  }

  const handleOnboardingDismiss = () => {
    localStorage.setItem(LS_ONBOARDING, '1')
    setShowOnboarding(false)
    if (pendingStart) {
      setPendingStart(false)
      launchSession()
    }
  }

  const launchSession = () => {
    dispatch({
      type: SESSION_ACTIONS.START_SESSION,
      scenario: selectedScenario!,
      persona: selectedPersona!,
      difficulty,
    })
    navigate('/session')
  }

  return (
    <main className={styles.page}>
      {showOnboarding && <OnboardingOverlay onDismiss={handleOnboardingDismiss} />}

      <header className={styles.header}>
        <p className={styles.eyebrow}>Sales Training</p>
        <h1 className={styles.title}>
          <img src="/logo-wordmark.svg" alt="AI Role Player" className={styles.logoWordmark} />
        </h1>
        <p className={styles.subtitle}>Practice customer conversations with AI-simulated personas</p>
      </header>

      {fetchError && (
        <div className={styles.errorBanner} role="alert">
          {fetchError}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.selectors}>
          <ScenarioSelector
            scenarios={scenarios}
            selected={selectedScenario}
            onSelect={handleScenarioSelect}
            loading={loading}
          />
          <PersonaSelector
            personas={personas}
            selectedScenario={selectedScenario}
            selected={selectedPersona}
            onSelect={setSelectedPersona}
          />
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </div>

        <div className={styles.divider} />

        <SessionSummaryCard scenario={selectedScenario} persona={selectedPersona} />

        <button
          className={styles.startBtn}
          onClick={handleStart}
          disabled={!canStart}
          aria-disabled={!canStart}
        >
          Start Role Play
        </button>
      </div>
    </main>
  )
}
