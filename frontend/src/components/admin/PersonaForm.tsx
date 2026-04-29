import { useState } from 'react'
import type { Persona } from '../../types'
import styles from './PersonaForm.module.css'

type FormData = Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>

interface Props {
  initial?: Persona
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
}

const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

function defaultForm(): FormData {
  return { name: '', traits: [], behaviorNotes: '', systemPrompt: '', difficulty: 'medium', voice: 'alloy' }
}

export default function PersonaForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>(() =>
    initial ? {
      name: initial.name,
      traits: initial.traits,
      behaviorNotes: initial.behaviorNotes,
      systemPrompt: initial.systemPrompt,
      difficulty: initial.difficulty,
      voice: initial.voice,
    } : defaultForm()
  )
  const [traitsText, setTraitsText] = useState(() => (initial?.traits ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const traits = traitsText.split(',').map(t => t.trim()).filter(Boolean)
      await onSave({ ...form, traits })
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input className={styles.input} value={form.name} required onChange={e => set('name', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Difficulty</label>
          <select className={styles.select} value={form.difficulty}
            onChange={e => set('difficulty', e.target.value as Persona['difficulty'])}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Traits <span className={styles.hint}>comma-separated</span></label>
          <input className={styles.input} value={traitsText} onChange={e => setTraitsText(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Voice</label>
          <select className={styles.select} value={form.voice} onChange={e => set('voice', e.target.value)}>
            {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Behavior Notes</label>
        <textarea className={styles.textarea} rows={3} value={form.behaviorNotes}
          onChange={e => set('behaviorNotes', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>System Prompt</label>
        <textarea className={styles.textarea} rows={12} value={form.systemPrompt} required
          onChange={e => set('systemPrompt', e.target.value)} />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
