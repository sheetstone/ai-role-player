import { Router } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Wrap raw 16-bit LE PCM in a WAV container so browsers can decode it.
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44)
  const dataSize = pcm.length
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)                                          // fmt chunk size
  header.writeUInt16LE(1, 20)                                           // PCM = 1
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28)  // byte rate
  header.writeUInt16LE(channels * bitsPerSample / 8, 32)               // block align
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcm])
}

const router = Router()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Map OpenAI voice names (stored in persona data) → Gemini TTS voice names
const VOICE_MAP: Record<string, string> = {
  alloy: 'Aoede',
  echo: 'Charon',
  fable: 'Kore',
  onyx: 'Fenrir',
  nova: 'Puck',
  shimmer: 'Zephyr',
}

const TTS_MODEL = 'gemini-2.5-flash-preview-tts'

router.post('/speak', async (req, res, next) => {
  try {
    const { text, voice, ttsModel } = req.body as { text?: string; voice?: string; ttsModel?: string }

    if (!text?.trim()) {
      res.status(400).json({ error: 'text is required' })
      return
    }

    const voiceName = VOICE_MAP[voice ?? ''] ?? 'Aoede'
    const model = genAI.getGenerativeModel({ model: ttsModel || TTS_MODEL })

    // responseModalities and speechConfig are TTS-specific fields not yet typed in
    // the SDK's GenerationConfig — use `as any` to pass them through.
    const result = await (model as any).generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
      },
    })

    const part = result.response.candidates?.[0]?.content?.parts?.[0] as any
    if (!part?.inlineData?.data) {
      res.status(502).json({ error: 'tts_failed', message: 'No audio returned from TTS service' })
      return
    }

    let audioBuffer = Buffer.from(part.inlineData.data as string, 'base64')
    let mimeType: string = part.inlineData.mimeType ?? 'audio/wav'

    // Gemini TTS returns raw PCM (audio/L16 or audio/l16) — wrap it in a WAV
    // container so browsers can decode it with AudioContext.decodeAudioData().
    if (mimeType.toLowerCase().startsWith('audio/l16') || mimeType.toLowerCase().startsWith('audio/pcm')) {
      const rateMatch = mimeType.match(/rate=(\d+)/i)
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000
      audioBuffer = pcmToWav(audioBuffer, sampleRate)
      mimeType = 'audio/wav'
    }

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', audioBuffer.length)
    res.send(audioBuffer)
  } catch (error) {
    console.error('TTS Error:', error)
    next(error)
  }
})

export default router
