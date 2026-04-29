import { Router } from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

const router = Router()
const upload = multer({ dest: 'uploads/' })

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' })
      return
    }

    const sttModel = (req.body as { sttModel?: string }).sttModel
      || process.env.GEMINI_MODEL
      || 'gemini-2.5-flash'
    const model = genAI.getGenerativeModel({ model: sttModel })

    // Read file and convert to base64
    const audioData = fs.readFileSync(req.file.path)
    const base64Audio = audioData.toString('base64')

    // Gemini Flash can process audio directly for transcription
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: req.file.mimetype === 'audio/webm' ? 'audio/webm' : 'audio/wav',
          data: base64Audio
        }
      },
      { text: "Transcribe this audio. Return ONLY the transcription text, nothing else." },
    ])

    const response = await result.response
    const text = response.text().trim()

    // Clean up temporary file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Failed to delete temp file:', err)
    })

    res.json({ text })
  } catch (error) {
    console.error('Gemini STT Error:', error)
    // Clean up temp file even on error
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    next(error)
  }
})

export default router
