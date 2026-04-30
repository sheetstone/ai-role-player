import { useEffect } from 'react'
import styles from './AdminModal.module.css'

interface Props {
  /** Text shown in the modal header (e.g. "New Scenario" or "Edit: Cold Call"). */
  title: string
  /** Called when the user closes the modal via the ✕ button, Escape key, or clicking the backdrop. */
  onClose: () => void
  /** The form or content to render inside the modal body. */
  children: React.ReactNode
}

/**
 * A generic modal dialog used in the Admin Console for creating and editing
 * scenarios and personas.
 *
 * Closes on:
 * - Clicking the ✕ button in the header
 * - Pressing the Escape key
 * - Clicking the darkened backdrop behind the modal
 *
 * Uses `role="dialog"` and `aria-modal="true"` for accessibility.
 */

export default function AdminModal({ title, onClose, children }: Props) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
