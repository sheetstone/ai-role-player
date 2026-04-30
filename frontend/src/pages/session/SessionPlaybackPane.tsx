import PlaybackControls from '../../components/session/PlaybackControls'

interface SessionPlaybackPaneProps {
  /** Current volume level from 0 (silent) to 1 (full). */
  volume: number
  /** Whether the AI voice is currently muted. */
  isMuted: boolean
  /** Mute the AI voice (sets gain to 0 without stopping the stream). */
  onMute: () => void
  /** Restore the AI voice to the previous volume. */
  onUnmute: () => void
  /** Set the volume (0–1). Updates the Web Audio gain node immediately. */
  onVolumeChange: (v: number) => void
  /** Skip the rest of the AI response and return to listening. */
  onSkip: () => void
}

/**
 * A named wrapper around `PlaybackControls`, shown only while the AI is speaking.
 * Having a dedicated pane component makes `SessionPage` easier to read — the
 * conditional `{state === 'speaking' && <SessionPlaybackPane ... />}` clearly
 * communicates intent.
 */

export default function SessionPlaybackPane({
  volume, isMuted, onMute, onUnmute, onVolumeChange, onSkip,
}: SessionPlaybackPaneProps) {
  return (
    <PlaybackControls
      volume={volume}
      isMuted={isMuted}
      onMute={onMute}
      onUnmute={onUnmute}
      onVolumeChange={onVolumeChange}
      onSkip={onSkip}
    />
  )
}
