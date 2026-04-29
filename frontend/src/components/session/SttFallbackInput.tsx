import { useState, type FormEvent } from 'react'
import styles from './VoicePanel.module.css'

interface Props {
  onSubmit: (text: string) => void
  onCancel: () => void
}

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
