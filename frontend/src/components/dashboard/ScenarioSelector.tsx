import { useState } from 'react'
import type { Scenario } from '../../types'
import { DASHBOARD_MAX_PILLS } from '../../constants'
import styles from './Dashboard.module.css'

interface Props {
  /** All available scenarios fetched from the backend. */
  scenarios: Scenario[]
  /** The currently selected scenario, or null if none chosen. */
  selected: Scenario | null
  /** Called when the user picks a scenario. Pass `null` to clear the selection. */
  onSelect: (scenario: Scenario) => void
  /** When true, shows a "Loading…" placeholder and disables the search input. */
  loading: boolean
}

/**
 * Lets the user pick a training scenario.
 *
 * Shows up to `DASHBOARD_MAX_PILLS` scenarios as quick-select buttons by default.
 * When the user starts typing in the search box, the pills are replaced with a
 * filtered dropdown list. Selecting from either clears the search query.
 *
 * A "✕" chip appears below the search box when a scenario is selected,
 * giving the user a clear way to deselect.
 */

export default function ScenarioSelector({ scenarios, selected, onSelect, loading }: Props) {
  const [query, setQuery] = useState('')

  const filtered = scenarios.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  )

  const preloaded = scenarios.slice(0, DASHBOARD_MAX_PILLS)

  return (
    <div className={styles.selectorGroup}>
      <label className={styles.label} htmlFor="scenario-search">
        Scenario
      </label>
      <div className={styles.searchBox}>
        <input
          id="scenario-search"
          type="text"
          placeholder={loading ? 'Loading…' : 'Search scenarios…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
          disabled={loading}
          autoComplete="off"
        />
      </div>

      {!loading && !query && (
        <div className={styles.pillContainer}>
          {preloaded.map((s) => (
            <button
              key={s.id}
              className={`${styles.pillBtn} ${selected?.id === s.id ? styles.pillBtnActive : ''}`}
              onClick={() => onSelect(s)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {query && (
        <ul className={styles.dropdown} role="listbox" aria-label="Scenarios">
          {filtered.length === 0 ? (
            <li className={styles.dropdownEmpty}>No scenarios found — ask your admin to create one</li>
          ) : (
            filtered.map((s) => (
              <li
                key={s.id}
                role="option"
                aria-selected={selected?.id === s.id}
                className={`${styles.dropdownItem} ${selected?.id === s.id ? styles.dropdownItemActive : ''}`}
                onClick={() => { onSelect(s); setQuery('') }}
              >
                {s.name}
              </li>
            ))
          )}
        </ul>
      )}
      {selected && !query && (
        <div className={styles.selectedPill}>
          {selected.name}
          <button className={styles.clearBtn} onClick={() => onSelect(null as unknown as Scenario)} aria-label="Clear scenario">✕</button>
        </div>
      )}
    </div>
  )
}
