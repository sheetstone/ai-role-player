import { useSession } from '../../context/SessionContext'
import type { SessionState } from '../../types'
import styles from './SessionStateIndicator.module.css'

type IndicatorType = 'dot' | 'spinner' | 'wave'

interface StateConfig {
  label: string
  indicator: IndicatorType
  pillClass: string
  dotClass?: string // only used when indicator === 'dot'
}

const STATE_CONFIG: Record<SessionState, StateConfig> = {
  idle:       { label: 'Ready',         indicator: 'dot',     pillClass: styles.idle,       dotClass: styles.dotIdle      },
  listening:  { label: 'Listening…',    indicator: 'dot',     pillClass: styles.listening,  dotClass: styles.dotListening },
  processing: { label: 'Processing…',   indicator: 'spinner', pillClass: styles.processing                                },
  speaking:   { label: 'Speaking…',     indicator: 'wave',    pillClass: styles.speaking                                  },
  paused:     { label: 'Paused',        indicator: 'dot',     pillClass: styles.paused,     dotClass: styles.dotPaused    },
  ended:      { label: 'Session Ended', indicator: 'dot',     pillClass: styles.ended,      dotClass: styles.dotEnded     },
}

function IndicatorIcon({ type, dotClass }: { type: IndicatorType; dotClass?: string }) {
  if (type === 'spinner') {
    return <span className={styles.spinner} aria-hidden="true" />
  }
  if (type === 'wave') {
    return (
      <span className={styles.waveBars} aria-hidden="true">
        <span className={styles.waveBar} />
        <span className={styles.waveBar} />
        <span className={styles.waveBar} />
      </span>
    )
  }
  return <span className={`${styles.dot} ${dotClass ?? ''}`} aria-hidden="true" />
}

export default function SessionStateIndicator() {
  const { state } = useSession()
  const config = STATE_CONFIG[state]

  return (
    <div
      className={`${styles.pill} ${config.pillClass}`}
      role="status"
      aria-live="polite"
      aria-label={`Session state: ${config.label}`}
    >
      <IndicatorIcon type={config.indicator} dotClass={config.dotClass} />
      <span className={styles.label}>{config.label}</span>
    </div>
  )
}
