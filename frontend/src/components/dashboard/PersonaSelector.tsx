import { useState } from 'react'
import type { Persona, Scenario } from '../../types'
import styles from './Dashboard.module.css'

interface Props {
  personas: Persona[]
  selectedScenario: Scenario | null
  selected: Persona | null
  onSelect: (persona: Persona) => void
}

export default function PersonaSelector({ personas, selectedScenario, selected, onSelect }: Props) {
  const [query, setQuery] = useState('')

  const compatible = selectedScenario?.compatiblePersonaIds.length
    ? personas.filter((p) => selectedScenario.compatiblePersonaIds.includes(p.id))
    : personas

  const filtered = compatible.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  // Show up to 10 preloaded personas as pills
  const preloaded = compatible.slice(0, 10)

  const disabled = !selectedScenario

  return (
    <div className={styles.selectorGroup}>
      <label className={styles.label} htmlFor="persona-search">
        Persona
      </label>
      <div className={styles.searchBox}>
        <input
          id="persona-search"
          type="text"
          placeholder={disabled ? 'Select a scenario first' : 'Search personas…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
          disabled={disabled}
          autoComplete="off"
          title={disabled ? 'Select a scenario first' : undefined}
        />
      </div>

      {!disabled && !query && (
        <div className={styles.pillContainer}>
          {preloaded.map((p) => (
            <button
              key={p.id}
              className={`${styles.pillBtn} ${selected?.id === p.id ? styles.pillBtnActive : ''}`}
              onClick={() => onSelect(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {query && !disabled && (
        <ul className={styles.dropdown} role="listbox" aria-label="Personas">
          {filtered.length === 0 ? (
            <li className={styles.dropdownEmpty}>No matching personas</li>
          ) : (
            filtered.map((p) => (
              <li
                key={p.id}
                role="option"
                aria-selected={selected?.id === p.id}
                className={`${styles.dropdownItem} ${selected?.id === p.id ? styles.dropdownItemActive : ''}`}
                onClick={() => { onSelect(p); setQuery('') }}
              >
                <span>{p.name}</span>
                <span className={styles.difficultyBadge} data-difficulty={p.difficulty}>
                  {p.difficulty}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
      {selected && !query && (
        <div className={styles.selectedPill}>
          {selected.name}
          <button className={styles.clearBtn} onClick={() => onSelect(null as unknown as Persona)} aria-label="Clear persona">✕</button>
        </div>
      )}
    </div>
  )
}
