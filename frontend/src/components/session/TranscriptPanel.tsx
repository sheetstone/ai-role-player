import { useEffect, useRef, useState, useCallback } from 'react'
import type { Turn } from '../../types'
import styles from './TranscriptPanel.module.css'

interface TranscriptPanelProps {
  turns: Turn[]
  sessionStartedAt: number
  activeTurnId: string | null  // FP-H02: persona turn currently being spoken
}

function formatTimestamp(turnTs: number, sessionStart: number): string {
  const elapsed = Math.max(0, Math.floor((turnTs - sessionStart) / 1000))
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return [h, m, s].map((n) => n.toString().padStart(2, '0')).join(':')
}

export default function TranscriptPanel({
  turns,
  sessionStartedAt,
  activeTurnId,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Track pinned state in a ref — no re-render needed on scroll
  const pinnedRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  // FP-H01 + FP-H03: auto-scroll to bottom when new content arrives,
  // but only if the user hasn't scrolled up.
  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [turns])

  // FP-H03: detect manual scroll, show / hide "Jump to latest"
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const pinned = distFromBottom <= 100
    pinnedRef.current = pinned
    setShowJump(!pinned)
  }, [])

  // FP-H03: jump button scrolls smoothly to bottom and re-pins
  const jumpToLatest = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    pinnedRef.current = true
    setShowJump(false)
  }, [])

  return (
    <div className={styles.wrapper}>
      <div
        ref={scrollRef}
        className={styles.scroll}
        onScroll={handleScroll}
        role="log"
        aria-label="Conversation transcript"
        aria-live="polite"
        aria-relevant="additions"
      >
        {turns.length === 0 ? (
          <p className={styles.empty}>Conversation will appear here once you start speaking.</p>
        ) : (
          <ul className={styles.turnList}>
            {turns.map((turn) => (
              <TurnItem
                key={turn.id}
                turn={turn}
                sessionStartedAt={sessionStartedAt}
                isActive={turn.id === activeTurnId}
              />
            ))}
          </ul>
        )}
      </div>

      {/* FP-H03: Jump to latest button */}
      {showJump && (
        <button
          className={styles.jumpBtn}
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}

// ── Individual turn ───────────────────────────────────────────────────────────

interface TurnItemProps {
  turn: Turn
  sessionStartedAt: number
  isActive: boolean
}

function TurnItem({ turn, sessionStartedAt, isActive }: TurnItemProps) {
  const isUser = turn.speaker === 'user'

  return (
    <li
      className={`${styles.turn} ${isUser ? styles.turnUser : styles.turnPersona} ${isActive ? styles.turnActive : ''}`}
    >
      <div className={styles.turnMeta}>
        <span className={styles.speaker}>
          {isUser ? 'You' : 'Persona'}
        </span>
        <time className={styles.timestamp}>
          {formatTimestamp(turn.timestamp, sessionStartedAt)}
        </time>
      </div>

      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubblePersona} ${isActive ? styles.bubbleActive : ''}`}>
        <span className={styles.text}>
          {turn.text || (turn.partial ? '' : '—')}
        </span>
        {/* FP-H01: blinking cursor on partial (streaming) turns */}
        {turn.partial && <span className={styles.cursor} aria-hidden="true" />}
      </div>
    </li>
  )
}
