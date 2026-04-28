import { useEffect, useRef } from 'react'

interface WaveformCanvasProps {
  analyserNode: AnalyserNode | null
  isRecording: boolean
  className?: string
}

// Color values matching the Bento CSS design tokens
const COLOR_ACTIVE = '#C4784A' // --orange
const COLOR_IDLE = '#E8D5C0' // --border

export default function WaveformCanvas({ analyserNode, isRecording, className }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    if (!isRecording || !analyserNode) {
      cancelAnimationFrame(rafRef.current)
      // Draw a flat center line as a placeholder
      ctx.clearRect(0, 0, W, H)
      ctx.beginPath()
      ctx.strokeStyle = COLOR_IDLE
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
      ctx.strokeStyle = COLOR_ACTIVE
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
