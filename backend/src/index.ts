import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import healthRouter from './routes/health.js'
import adminRouter from './routes/admin.js'
import audioRouter from './routes/audio.js'
import chatRouter from './routes/chat.js'
import ttsRouter from './routes/tts.js'
import feedbackRouter from './routes/feedback.js'
import { errorHandler } from './middleware/errorHandler.js'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

const app = express()

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/admin', adminRouter)
app.use('/api/audio', audioRouter)
app.use('/api/chat', chatRouter)
app.use('/api/tts', ttsRouter)
app.use('/api/feedback', feedbackRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
