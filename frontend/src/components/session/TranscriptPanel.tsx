import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from '../../context/SessionContext'
import { TRANSCRIPT_SCROLL_PIN_THRESHOLD_PX } from '../../constants'
import TurnItem from './TurnItem'
import styles from './TranscriptPanel.module.css'

/**
 * Scrollable conversation log shown during a session. New turns appear at the
 * bottom and the panel auto-scrolls to follow them.
 *
 * Reads `session.turns`, `session.startedAt`, and `state` directly from
 * `SessionContext` — no props needed, following the same pattern as
 * `SessionStateIndicator`.
 *
 * If the user scrolls up to review earlier turns, auto-scroll pauses and a
 * "Jump to latest" button appears. Scrolling back to the bottom (within
 * `TRANSCRIPT_SCROLL_PIN_THRESHOLD_PX` pixels) re-enables auto-scroll.
 */

export default function TranscriptPanel() {
  const { session, state } = useSession()
  const turns = session?.turns ?? []
  const sessionStartedAt = session?.startedAt ?? 0
  const activeTurnId = state === 'speaking'
    ? turns.slice().reverse().find((t) => t.speaker === 'persona' && !t.partial)?.id ?? null
    : null
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [turns])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedRef.current = distFromBottom <= TRANSCRIPT_SCROLL_PIN_THRESHOLD_PX
    setShowJump(!pinnedRef.current)
  }, [])

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

      {showJump && (
        <button className={styles.jumpBtn} onClick={jumpToLatest} aria-label="Jump to latest message">
          ↓ Jump to latest
        </button>
      )}
    </div>
  )
}
