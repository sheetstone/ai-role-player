import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useModelConfig, LLM_OPTIONS, TTS_OPTIONS } from '../../hooks/useModelConfig'
import styles from './ModelSelector.module.css'

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
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
