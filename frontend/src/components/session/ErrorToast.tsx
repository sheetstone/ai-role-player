import { useEffect } from 'react'
import styles from './ErrorToast.module.css'

interface ErrorToastProps {
  message: string
  onDismiss: () => void
  onRetry?: () => void
  autoDismissMs?: number
}

export default function ErrorToast({
  message,
  onDismiss,
  onRetry,
  autoDismissMs = 6000,
}: ErrorToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(id)
  }, [onDismiss, autoDismissMs])

  return (
    <div className={styles.toast} role="alert" aria-live="assertive">
      <span className={styles.message}>{message}</span>
      <div className={styles.actions}>
        {onRetry && (
          <button className={styles.retryBtn} onClick={() => { onRetry(); onDismiss() }}>
            Retry
          </button>
        )}
        <button className={styles.dismissBtn} onClick={onDismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  )
}
