import { useState } from 'react'
import type { Scenario, Persona } from '../../types'
import { useArrayField } from '../../hooks/useArrayField'
import styles from './ScenarioForm.module.css'

type FormData = Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>

interface Props {
  /** Pre-fill the form with this scenario's data when editing an existing one. Omit for "New Scenario". */
  initial?: Scenario
  /** List of all personas — shown as checkboxes so the admin can mark which ones are compatible. */
  personas: Persona[]
  /** Called with the validated form data when the user clicks Save. The parent handles the API call. */
  onSave: (data: FormData) => Promise<void>
  /** Called when the user clicks Cancel without saving. */
  onCancel: () => void
}

/**
 * Form for creating or editing a training scenario in the Admin Console.
 *
 * Key fields:
 * - **Goals** — one per line in a textarea, split into an array on submit
 * - **Compatible Personas** — checkbox list; limits which personas learners can pair with this scenario
 * - **Scoring Weights** — category + percentage pairs that must sum to exactly 100
 * - **Voice Behavior** — interrupt frequency, speaking pace, tone style used when generating AI prompts
 *
 * Validates that scoring weights sum to 100 before calling `onSave`. Shows an
 * inline error if they don't.
 */

function defaultForm(): FormData {
  return {
    name: '',
    description: '',
    goals: [],
    suggestedSkillFocus: '',
    compatiblePersonaIds: [],
    scoringWeights: [
      { category: 'Discovery', weight: 25 },
      { category: 'Value Articulation', weight: 25 },
      { category: 'Objection Handling', weight: 25 },
      { category: 'Closing', weight: 25 },
    ],
    voiceBehavior: { interruptFrequency: 'medium', speakingPace: 'normal', toneStyle: '' },
  }
}

export default function ScenarioForm({ initial, personas, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>(() =>
    initial ? {
      name: initial.name,
      description: initial.description,
      goals: initial.goals,
      suggestedSkillFocus: initial.suggestedSkillFocus,
      compatiblePersonaIds: initial.compatiblePersonaIds,
      scoringWeights: initial.scoringWeights,
      voiceBehavior: initial.voiceBehavior,
    } : defaultForm()
  )
  const [goalsText, setGoalsText, parseGoals] = useArrayField(initial?.goals ?? [], '\n')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightTotal = form.scoringWeights.reduce((s, w) => s + Number(w.weight), 0)

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const togglePersona = (id: string) =>
    set('compatiblePersonaIds',
      form.compatiblePersonaIds.includes(id)
        ? form.compatiblePersonaIds.filter(x => x !== id)
        : [...form.compatiblePersonaIds, id]
    )

  const updateWeight = (i: number, field: 'category' | 'weight', value: string | number) =>
    set('scoringWeights', form.scoringWeights.map((w, idx) => idx === i ? { ...w, [field]: value } : w))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (weightTotal !== 100) { setError('Scoring weights must sum to 100'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ ...form, goals: parseGoals() })
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.field}>
        <label className={styles.label}>Name</label>
        <input className={styles.input} value={form.name} required onChange={e => set('name', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.textarea} rows={3} value={form.description} required onChange={e => set('description', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Goals <span className={styles.hint}>one per line</span></label>
        <textarea className={styles.textarea} rows={5} value={goalsText} onChange={e => setGoalsText(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Suggested Skill Focus</label>
        <input className={styles.input} value={form.suggestedSkillFocus} onChange={e => set('suggestedSkillFocus', e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Compatible Personas</label>
        <div className={styles.checkList}>
          {personas.map(p => (
            <label key={p.id} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={form.compatiblePersonaIds.includes(p.id)}
                onChange={() => togglePersona(p.id)}
              />
              <span>{p.name}</span>
            </label>
          ))}
          {personas.length === 0 && <span className={styles.hint}>No personas yet.</span>}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          Scoring Weights
          <span className={weightTotal === 100 ? styles.sumOk : styles.sumBad}> total: {weightTotal}</span>
        </label>
        <div className={styles.weightList}>
          {form.scoringWeights.map((w, i) => (
            <div key={i} className={styles.weightRow}>
              <input
                className={styles.weightCategory}
                placeholder="Category"
                value={w.category}
                onChange={e => updateWeight(i, 'category', e.target.value)}
              />
              <input
                className={styles.weightNumber}
                type="number"
                min={0}
                max={100}
                value={w.weight}
                onChange={e => updateWeight(i, 'weight', Number(e.target.value))}
              />
              <button type="button" className={styles.removeBtn} onClick={() =>
                set('scoringWeights', form.scoringWeights.filter((_, idx) => idx !== i))
              }>✕</button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={() =>
            set('scoringWeights', [...form.scoringWeights, { category: '', weight: 0 }])
          }>+ Add category</button>
        </div>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Voice Behavior</legend>
        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.label}>Interrupt</label>
            <select className={styles.select} value={form.voiceBehavior.interruptFrequency}
              onChange={e => set('voiceBehavior', { ...form.voiceBehavior, interruptFrequency: e.target.value as Scenario['voiceBehavior']['interruptFrequency'] })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Pace</label>
            <select className={styles.select} value={form.voiceBehavior.speakingPace}
              onChange={e => set('voiceBehavior', { ...form.voiceBehavior, speakingPace: e.target.value as Scenario['voiceBehavior']['speakingPace'] })}>
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Tone</label>
            <input className={styles.input} value={form.voiceBehavior.toneStyle}
              onChange={e => set('voiceBehavior', { ...form.voiceBehavior, toneStyle: e.target.value })} />
          </div>
        </div>
      </fieldset>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  )
}
