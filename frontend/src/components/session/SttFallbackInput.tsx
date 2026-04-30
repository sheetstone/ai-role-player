import { useState, type FormEvent } from 'react'
import styles from './VoicePanel.module.css'

interface Props {
  /** Called with the trimmed text when the user submits the form. */
  onSubmit: (text: string) => void
  /** Called when the user dismisses the fallback without submitting. */
  onCancel: () => void
}

/**
 * A text input that appears when speech-to-text fails repeatedly
 * (after `STT_FAILURES_BEFORE_FALLBACK` consecutive errors).
 *
 * This lets the user continue the conversation by typing instead of speaking,
 * keeping the session alive even when the microphone or STT service has issues.
 * The input auto-focuses when it appears so the user can start typing immediately.
 */

export default function SttFallbackInput({ onSubmit, onCancel }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSubmit(text.trim())
      setText('')
    }
  }

  return (
    <div className={styles.fallbackContainer}>
      <p className={styles.fallbackLabel}>Something went wrong with the voice transcription. Please type your message below:</p>
      <form onSubmit={handleSubmit} className={styles.fallbackForm}>
        <input
          type="text"
          className={styles.fallbackInput}
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className={styles.fallbackActions}>
          <button type="button" onClick={onCancel} className={styles.fallbackCancel}>
            Cancel
          </button>
          <button type="submit" disabled={!text.trim()} className={styles.fallbackSubmit}>
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
