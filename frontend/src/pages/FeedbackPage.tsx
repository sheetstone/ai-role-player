import { Link } from 'react-router-dom'

export default function FeedbackPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Coaching &amp; Feedback</h1>
      <p>Session summary and key moments go here.</p>
      <nav style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to Dashboard</Link>
      </nav>
    </main>
  )
}
