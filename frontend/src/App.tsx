import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SessionProvider } from './context/SessionContext'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import FeedbackPage from './pages/FeedbackPage'
import AdminPage from './pages/AdminPage'
import ModelSelector from './components/dashboard/ModelSelector'

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <ModelSelector />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
