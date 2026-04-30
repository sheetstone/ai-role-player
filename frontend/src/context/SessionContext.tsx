import { createContext, useContext, useReducer, type Dispatch } from 'react'
import type { Session, SessionState, Scenario, Persona, Turn } from '../types'
import { generateId } from '../utils'

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * All valid action type strings, exported as a const object so callers get
 * autocomplete and can't mistype a string.
 *
 * Usage: `dispatch({ type: SESSION_ACTIONS.PAUSE_SESSION })`
 *
 * | Key | When to dispatch |
 * |---|---|
 * | START_SESSION | User clicks "Start Role Play" on the dashboard |
 * | START_RECORDING | Mic button pressed (reserved — state stays 'listening') |
 * | STOP_RECORDING | Mic button released; blob sent to STT → moves to 'processing' |
 * | ADD_TURN | New transcript turn added (user or persona) |
 * | UPDATE_TURN | Streaming token arrives — update in-progress persona text |
 * | FIRST_AUDIO_CHUNK | TTS audio decoded and ready — moves to 'speaking' |
 * | AUDIO_COMPLETE | AI finished speaking naturally — moves back to 'listening' |
 * | SKIP_AI | User interrupted — moves back to 'listening' immediately |
 * | PAUSE_SESSION | User paused the session |
 * | RESUME_SESSION | User resumed after pause |
 * | END_SESSION | User ended the session — moves to 'ended', sets endedAt |
 * | ERROR | Something went wrong — stores the message and moves to 'listening' |
 * | RESET | Return to the initial state (used before restarting) |
 */
export const SESSION_ACTIONS = {
  START_SESSION:     'START_SESSION',
  START_RECORDING:   'START_RECORDING',
  STOP_RECORDING:    'STOP_RECORDING',
  ADD_TURN:          'ADD_TURN',
  UPDATE_TURN:       'UPDATE_TURN',
  FIRST_AUDIO_CHUNK: 'FIRST_AUDIO_CHUNK',
  AUDIO_COMPLETE:    'AUDIO_COMPLETE',
  SKIP_AI:           'SKIP_AI',
  PAUSE_SESSION:     'PAUSE_SESSION',
  RESUME_SESSION:    'RESUME_SESSION',
  END_SESSION:       'END_SESSION',
  ERROR:             'ERROR',
  RESET:             'RESET',
} as const

type Action =
  | { type: typeof SESSION_ACTIONS.START_SESSION; scenario: Scenario; persona: Persona; difficulty: Session['difficulty'] }
  | { type: typeof SESSION_ACTIONS.START_RECORDING }
  | { type: typeof SESSION_ACTIONS.STOP_RECORDING }
  | { type: typeof SESSION_ACTIONS.ADD_TURN; turn: Turn }
  | { type: typeof SESSION_ACTIONS.UPDATE_TURN; id: string; text: string; partial: boolean }
  | { type: typeof SESSION_ACTIONS.FIRST_AUDIO_CHUNK }
  | { type: typeof SESSION_ACTIONS.AUDIO_COMPLETE }
  | { type: typeof SESSION_ACTIONS.SKIP_AI }
  | { type: typeof SESSION_ACTIONS.PAUSE_SESSION }
  | { type: typeof SESSION_ACTIONS.RESUME_SESSION }
  | { type: typeof SESSION_ACTIONS.END_SESSION }
  | { type: typeof SESSION_ACTIONS.ERROR; message: string }
  | { type: typeof SESSION_ACTIONS.RESET }

// ─── State ───────────────────────────────────────────────────────────────────

interface SessionContextState {
  session: Session | null
  state: SessionState
  error: string | null
}

const initialState: SessionContextState = {
  session: null,
  state: 'idle',
  error: null,
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(ctx: SessionContextState, action: Action): SessionContextState {
  const { session, state } = ctx

  switch (action.type) {
    case SESSION_ACTIONS.START_SESSION:
      return {
        error: null,
        state: 'listening',
        session: {
          id: generateId(),
          scenario: action.scenario,
          persona: action.persona,
          difficulty: action.difficulty,
          turns: [],
          state: 'listening',
          startedAt: Date.now(),
        },
      }

    case SESSION_ACTIONS.START_RECORDING:
      if (state !== 'listening') return ctx
      return { ...ctx, state: 'listening' }

    case SESSION_ACTIONS.STOP_RECORDING:
      if (state !== 'listening') return ctx
      return { ...ctx, state: 'processing' }

    case SESSION_ACTIONS.ADD_TURN:
      if (!session) return ctx
      return {
        ...ctx,
        error: null,  // clear any stale error on successful forward progress
        session: { ...session, turns: [...session.turns, action.turn] },
      }

    case SESSION_ACTIONS.UPDATE_TURN: {
      if (!session) return ctx
      const turns = session.turns.map((t) =>
        t.id === action.id ? { ...t, text: action.text, partial: action.partial } : t
      )
      return { ...ctx, session: { ...session, turns } }
    }

    case SESSION_ACTIONS.FIRST_AUDIO_CHUNK:
      if (state !== 'processing') return ctx
      return { ...ctx, state: 'speaking' }

    case SESSION_ACTIONS.AUDIO_COMPLETE:
    case SESSION_ACTIONS.SKIP_AI:
      if (state !== 'speaking') return ctx
      return { ...ctx, error: null, state: 'listening' }

    case SESSION_ACTIONS.PAUSE_SESSION:
      if (state === 'paused' || state === 'ended' || state === 'idle') return ctx
      return { ...ctx, state: 'paused' }

    case SESSION_ACTIONS.RESUME_SESSION:
      if (state !== 'paused') return ctx
      return { ...ctx, state: 'listening' }

    case SESSION_ACTIONS.END_SESSION:
      if (!session) return ctx
      return {
        ...ctx,
        state: 'ended',
        session: { ...session, state: 'ended', endedAt: Date.now() },
      }

    case SESSION_ACTIONS.ERROR:
      return { ...ctx, state: 'listening', error: action.message }

    case SESSION_ACTIONS.RESET:
      return initialState

    default:
      return ctx
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface SessionContextValue extends SessionContextState {
  dispatch: Dispatch<Action>
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * Wraps your component tree with session state. Place this near the top of the
 * app (e.g. in `App.tsx`) so all pages can access the session via `useSession()`.
 *
 * @example
 * // In App.tsx:
 * <SessionProvider>
 *   <RouterProvider router={router} />
 * </SessionProvider>
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ctx, dispatch] = useReducer(reducer, initialState)
  return <SessionContext.Provider value={{ ...ctx, dispatch }}>{children}</SessionContext.Provider>
}

/**
 * Access the current session state and dispatch actions from any component
 * inside `SessionProvider`.
 *
 * Returns:
 * - `session` — the active session object (scenario, persona, turns, timestamps), or null before a session starts
 * - `state` — the current machine state: 'idle' | 'listening' | 'processing' | 'speaking' | 'paused' | 'ended'
 * - `error` — the latest error message, or null if everything is fine
 * - `dispatch` — send actions to move the session forward (see the Action type for the full list)
 *
 * @example
 * const { session, state, dispatch } = useSession()
 * dispatch({ type: SESSION_ACTIONS.PAUSE_SESSION })
 */
export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
