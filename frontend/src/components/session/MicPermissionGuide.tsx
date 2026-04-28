import styles from './MicPermissionGuide.module.css'

interface MicPermissionGuideProps {
  onRetry: () => void
}

type BrowserKey = 'chrome' | 'firefox' | 'safari' | 'other'

function detectBrowser(): BrowserKey {
  const ua = navigator.userAgent
  if (/Chrome/.test(ua) && !/Edg|OPR/.test(ua)) return 'chrome'
  if (/Firefox/.test(ua)) return 'firefox'
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari'
  return 'other'
}

const STEPS: Record<BrowserKey, string[]> = {
  chrome: [
    'Click the lock icon (🔒) in the address bar',
    'Find "Microphone" and change it to "Allow"',
    'Reload the page, then click "Try again" below',
  ],
  firefox: [
    'Click the microphone icon in the address bar',
    'Select "Blocked" next to microphone and choose "Allow"',
    'Reload the page, then click "Try again" below',
  ],
  safari: [
    'Open Safari → Settings → Websites → Microphone',
    'Find this site and set it to "Allow"',
    'Reload the page, then click "Try again" below',
  ],
  other: [
    'Open your browser settings and find Site Permissions',
    'Allow microphone access for this site',
    'Reload the page, then click "Try again" below',
  ],
}

const BROWSER_LABEL: Record<BrowserKey, string> = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  safari: 'Safari',
  other: 'your browser',
}

export default function MicPermissionGuide({ onRetry }: MicPermissionGuideProps) {
  const browser = detectBrowser()
  const steps = STEPS[browser]

  return (
    <div className={styles.guide} role="alert" aria-live="assertive">
      <div className={styles.iconWrap} aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
          <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>

      <h2 className={styles.title}>Microphone access needed</h2>

      <p className={styles.body}>
        Voice practice requires your microphone. It looks like access was blocked in{' '}
        {BROWSER_LABEL[browser]}.
      </p>

      <div className={styles.stepsWrap}>
        <p className={styles.stepsLabel}>To fix this:</p>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <button className={styles.retryBtn} onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
