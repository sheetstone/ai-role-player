import { useState } from 'react'
import type { Session, FeedbackResult } from '../../types'
import styles from './ExportControls.module.css'

interface ExportControlsProps {
  session: Session
  feedback: FeedbackResult | null
}

function formatElapsed(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

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

  const slug = session.scenario.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildTxtContent(session, feedback))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
