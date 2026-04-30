import { useState } from 'react'
import type { Persona } from '../../types'
import { PERSONA_VOICES } from '../../constants'
import { useArrayField } from '../../hooks/useArrayField'
import styles from './PersonaForm.module.css'

type FormData = Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>

interface Props {
  /** Pre-fill the form when editing an existing persona. Omit for "New Persona". */
  initial?: Persona
  /** Called with the validated form data when the user clicks Save. The parent handles the API call. */
  onSave: (data: FormData) => Promise<void>
  /** Called when the user clicks Cancel without saving. */
  onCancel: () => void
}

/**
 * Form for creating or editing an AI persona in the Admin Console.
 *
 * Key fields:
 * - **Traits** — comma-separated list, split into an array on submit
 * - **Voice** — dropdown of available TTS voice names (from `PERSONA_VOICES` in constants)
 * - **System Prompt** — the full LLM instruction text that defines the persona's behavior in sessions
 * - **Behavior Notes** — human-readable summary shown to learners on the dashboard preview card
 */

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
  const [traitsText, setTraitsText, parseTraits] = useArrayField(initial?.traits ?? [], ', ')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ ...form, traits: parseTraits() })
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
            {PERSONA_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
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
