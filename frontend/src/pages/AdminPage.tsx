import { Link } from 'react-router-dom'

export default function AdminPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Admin Console</h1>
      <p>Scenario and persona management goes here.</p>
      <nav style={{ marginTop: '1rem' }}>
        <Link to="/">← Back to Dashboard</Link>
      </nav>
    </main>
  )
}
