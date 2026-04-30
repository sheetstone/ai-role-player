import { useEffect, useRef } from 'react'

interface WaveformCanvasProps {
  /** The Web Audio AnalyserNode to read frequency data from. Null = show idle flat line. */
  analyserNode: AnalyserNode | null
  /** When true, runs the requestAnimationFrame loop to draw live audio data. */
  isRecording: boolean
  /** Optional CSS class for sizing/positioning the canvas. */
  className?: string
}

/**
 * Draws a live audio waveform while the user is recording, or a flat idle line
 * when not recording. Uses `requestAnimationFrame` for smooth 60fps animation.
 *
 * Colors are read from CSS custom properties (`--orange` and `--border`) so
 * they automatically adapt to any theme changes without touching this file.
 *
 * The canvas is marked `aria-hidden` — screen reader users rely on the
 * recording timer and button state, not this visual indicator.
 */

export default function WaveformCanvas({ analyserNode, isRecording, className }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    // Read colors from CSS design tokens so they stay in sync with the theme
    const computed = getComputedStyle(canvas)
    const colorActive = computed.getPropertyValue('--orange').trim() || '#C4784A'
    const colorIdle = computed.getPropertyValue('--border').trim() || '#E8D5C0'

    if (!isRecording || !analyserNode) {
      cancelAnimationFrame(rafRef.current)
      ctx.clearRect(0, 0, W, H)
      ctx.beginPath()
      ctx.strokeStyle = colorIdle
      ctx.lineWidth = 1.5
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
      return
    }

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      analyserNode!.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, W, H)
      ctx.beginPath()
      ctx.strokeStyle = colorActive
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'

      const sliceWidth = W / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * H) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }

      ctx.lineTo(W, H / 2)
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyserNode, isRecording])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={48}
      className={className}
      aria-hidden="true"
    />
  )
}
