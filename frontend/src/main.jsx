import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import BackendGate from './components/BackendGate'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Nothing renders (and no API call is made) until the backend answers /api/health. */}
      <BackendGate>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BackendGate>
    </ErrorBoundary>
  </StrictMode>,
)
