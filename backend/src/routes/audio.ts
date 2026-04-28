import { Router } from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import fs from 'fs'

const router = Router()
const upload = multer({ dest: 'uploads/' })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' })
      return
    }

    const fileStream = fs.createReadStream(req.file.path)
    
    // Whisper supports many formats, but we explicitly tell it webm since frontend sends webm
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
    })

    // Clean up temporary file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Failed to delete temp file:', err)
    })

    res.json({ text: transcription.text })
  } catch (error) {
    // Clean up temp file even on error
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    next(error)
  }
})

export default router
