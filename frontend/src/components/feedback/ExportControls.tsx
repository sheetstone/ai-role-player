import { useState } from 'react'
import type { Session, FeedbackResult } from '../../types'
import { formatElapsed, slugify } from '../../utils'
import { COPY_FEEDBACK_TIMEOUT_MS } from '../../constants'
import styles from './ExportControls.module.css'

interface ExportControlsProps {
  /** The completed session — used to build the transcript text and derive the filename. */
  session: Session
  /** The AI-generated feedback to include in the export. If null, the export still works without it. */
  feedback: FeedbackResult | null
}

/**
 * Toolbar with three export actions for the session transcript:
 * - **Copy transcript** — copies formatted plain text to the clipboard (button shows "✓ Copied!" briefly)
 * - **Download .txt** — triggers a browser download of the formatted transcript
 * - **Download .json** — triggers a browser download of the raw session + feedback data
 *
 * The filename is derived from the scenario name via `slugify` so it's safe for
 * all operating systems (e.g. "cold-call-scenario-transcript.txt").
 */

function buildTxtContent(session: Session, feedback: FeedbackResult | null): string {
  const duration = session.endedAt
    ? formatElapsed(session.endedAt - session.startedAt)
    : formatElapsed(Date.now() - session.startedAt)
  const completedTurns = session.turns.filter(t => !t.partial)

  const lines: string[] = [
    'AI Role Player Session',
    `Scenario: ${session.scenario.name} | Persona: ${session.persona.name} | Duration: ${duration} | Turns: ${completedTurns.length}`,
    '',
  ]

  if (feedback) {
    lines.push('=== FEEDBACK ===', feedback.overallAssessment, '')
  }

  lines.push('=== TRANSCRIPT ===')
  for (const turn of completedTurns) {
    const elapsed = formatElapsed(turn.timestamp - session.startedAt)
    const speaker = turn.speaker === 'user' ? 'You' : session.persona.name
    lines.push(`[${elapsed}] ${speaker}: ${turn.text}`)
  }

  return lines.join('\n')
}

function buildJsonContent(session: Session, feedback: FeedbackResult | null): string {
  return JSON.stringify({ session, feedback }, null, 2)
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportControls({ session, feedback }: ExportControlsProps) {
  const [copied, setCopied] = useState(false)

  const slug = slugify(session.scenario.name)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildTxtContent(session, feedback))
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT_MS)
  }

  const handleTxt = () => {
    triggerDownload(buildTxtContent(session, feedback), `${slug}-transcript.txt`, 'text/plain')
  }

  const handleJson = () => {
    triggerDownload(buildJsonContent(session, feedback), `${slug}-session.json`, 'application/json')
  }

  return (
    <div className={styles.controls} role="toolbar" aria-label="Export options">
      <button className={`${styles.btn} ${copied ? styles.btnCopied : ''}`} onClick={handleCopy}>
        {copied ? '✓ Copied!' : 'Copy transcript'}
      </button>
      <button className={styles.btn} onClick={handleTxt}>
        Download .txt
      </button>
      <button className={styles.btn} onClick={handleJson}>
        Download .json
      </button>
    </div>
  )
}
