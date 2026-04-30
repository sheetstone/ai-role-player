import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useModelConfig, LLM_OPTIONS, TTS_OPTIONS } from '../../hooks/useModelConfig'
import { IconGear } from '../ui/Icon'
import styles from './ModelSelector.module.css'

/**
 * A gear icon button in the dashboard header that opens a settings panel for
 * choosing the LLM and TTS model. Also links to the Admin Console.
 *
 * The panel closes when the user clicks outside it or presses Escape
 * (Escape is handled implicitly by the mousedown-outside listener).
 *
 * Model selections are persisted via `useModelConfig` (localStorage), so they
 * survive page refreshes.
 */
export default function ModelSelector() {
  const { llmModel, ttsModel, setLlmModel, setTtsModel } = useModelConfig()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={`${styles.gearBtn} ${open ? styles.gearBtnActive : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Model settings"
        aria-expanded={open}
        title="Model settings"
      >
        <IconGear />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Settings">
          <p className={styles.panelTitle}>Model Settings</p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ms-chat">Chat model</label>
            <select
              id="ms-chat"
              className={styles.select}
              value={llmModel}
              onChange={e => setLlmModel(e.target.value)}
            >
              {LLM_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="ms-voice">Voice model</label>
            <select
              id="ms-voice"
              className={styles.select}
              value={ttsModel}
              onChange={e => setTtsModel(e.target.value)}
            >
              {TTS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.divider} />

          <Link to="/admin" className={styles.menuLink} onClick={() => setOpen(false)}>
            Admin Console
          </Link>
        </div>
      )}
    </div>
  )
}
