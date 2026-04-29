import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useModelConfig } from '../hooks/useModelConfig'
import { voiceApi } from '../services/voiceApi'
import type { FeedbackResult } from '../types'
import FeedbackSummary from '../components/feedback/FeedbackSummary'
import KeyMomentCard from '../components/feedback/KeyMomentCard'
import TranscriptViewer from '../components/feedback/TranscriptViewer'
import ExportControls from '../components/feedback/ExportControls'
import styles from './FeedbackPage.module.css'

function formatDuration(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${rem.toString().padStart(2, '0')}`
}

export default function FeedbackPage() {
  const { session } = useSession()
  const { llmModel } = useModelConfig()
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const completedTurns = session?.turns.filter(t => !t.partial) ?? []

  useEffect(() => {
    if (!session || completedTurns.length === 0) return
    setLoading(true)
    setApiError(null)
    voiceApi.generateFeedback({
      turns: completedTurns.map(t => ({
        id: t.id, speaker: t.speaker, text: t.text, timestamp: t.timestamp,
      })),
      scenarioId: session.scenario.id,
      personaId: session.persona.id,
      llmModel,
    })
      .then(setFeedback)
      .catch(() => setApiError('Feedback unavailable — you can still review your transcript below.'))
      .finally(() => setLoading(false))
  // Only run on mount — session changes during the session page, not here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!session) {
    return (
      <main className={styles.page}>
        <p className={styles.noSession}>
          No session found. <Link to="/">Return to dashboard</Link>
        </p>
      </main>
    )
  }

  const duration = formatDuration(
    session.endedAt ? session.endedAt - session.startedAt : Date.now() - session.startedAt
  )

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Session Feedback</h1>
        <nav className={styles.nav}>
          <Link to="/">← Dashboard</Link>
        </nav>
      </header>

      {/* FP-J05: Metadata bar */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Scenario</span>
          <span className={styles.metaValue}>{session.scenario.name}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Persona</span>
          <span className={styles.metaValue}>{session.persona.name}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Duration</span>
          <span className={styles.metaValue}>{duration}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Turns</span>
          <span className={styles.metaValue}>{completedTurns.length}</span>
        </div>
      </div>

      {/* FP-J06: Export controls */}
      {completedTurns.length > 0 && (
        <ExportControls session={session} feedback={feedback} />
      )}

      {/* FP-J02: Feedback summary */}
      {loading && (
        <div className={styles.loading} role="status" aria-busy="true">
          <div className={styles.spinner} aria-hidden="true" />
          <span>Generating your feedback…</span>
        </div>
      )}

      {!loading && apiError && (
        <div className={styles.errorBanner} role="alert">
          {apiError}
        </div>
      )}

      {!loading && feedback && (
        <>
          <FeedbackSummary feedback={feedback} />

          {/* FP-J03: Key moments overview */}
          {feedback.keyMoments.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Key Moments</h2>
              <div className={styles.momentsList}>
                {feedback.keyMoments.map((moment) => {
                  const turn = completedTurns.find(t => t.id === moment.turnId)
                  return (
                    <KeyMomentCard
                      key={`${moment.turnId}-${moment.label}`}
                      moment={moment}
                      turnText={turn?.text}
                    />
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* FP-J04: Full transcript */}
      {completedTurns.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Full Transcript</h2>
          <TranscriptViewer
            turns={completedTurns}
            sessionStartedAt={session.startedAt}
            keyMoments={feedback?.keyMoments ?? []}
          />
        </section>
      )}
    </main>
  )
}
