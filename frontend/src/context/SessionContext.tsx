import { createContext, useContext, useReducer, type Dispatch } from 'react'
import type { Session, SessionState, Scenario, Persona, Turn } from '../types'

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START_SESSION'; scenario: Scenario; persona: Persona; difficulty: Session['difficulty'] }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'ADD_TURN'; turn: Turn }
  | { type: 'UPDATE_TURN'; id: string; text: string; partial: boolean }
  | { type: 'FIRST_AUDIO_CHUNK' }
  | { type: 'AUDIO_COMPLETE' }
  | { type: 'SKIP_AI' }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'END_SESSION' }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }

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
    case 'START_SESSION':
      return {
        error: null,
        state: 'listening',
        session: {
          id: crypto.randomUUID(),
          scenario: action.scenario,
          persona: action.persona,
          difficulty: action.difficulty,
          turns: [],
          state: 'listening',
          startedAt: Date.now(),
        },
      }

    case 'START_RECORDING':
      if (state !== 'listening') return ctx
      return { ...ctx, state: 'listening' }

    case 'STOP_RECORDING':
      if (state !== 'listening') return ctx
      return { ...ctx, state: 'processing' }

    case 'ADD_TURN':
      if (!session) return ctx
      return {
        ...ctx,
        error: null,  // clear any stale error on successful forward progress
        session: { ...session, turns: [...session.turns, action.turn] },
      }

    case 'UPDATE_TURN': {
      if (!session) return ctx
      const turns = session.turns.map((t) =>
        t.id === action.id ? { ...t, text: action.text, partial: action.partial } : t
      )
      return { ...ctx, session: { ...session, turns } }
    }

    case 'FIRST_AUDIO_CHUNK':
      if (state !== 'processing') return ctx
      return { ...ctx, state: 'speaking' }

    case 'AUDIO_COMPLETE':
    case 'SKIP_AI':
      if (state !== 'speaking') return ctx
      return { ...ctx, error: null, state: 'listening' }

    case 'PAUSE_SESSION':
      if (state === 'paused' || state === 'ended' || state === 'idle') return ctx
      return { ...ctx, state: 'paused' }

    case 'RESUME_SESSION':
      if (state !== 'paused') return ctx
      return { ...ctx, state: 'listening' }

    case 'END_SESSION':
      if (!session) return ctx
      return {
        ...ctx,
        state: 'ended',
        session: { ...session, state: 'ended', endedAt: Date.now() },
      }

    case 'ERROR':
      return { ...ctx, state: 'listening', error: action.message }

    case 'RESET':
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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ctx, dispatch] = useReducer(reducer, initialState)
  return <SessionContext.Provider value={{ ...ctx, dispatch }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
