import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TenantScopeProvider } from './context/TenantScope'
import { App } from './App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TenantScopeProvider>
          <App />
        </TenantScopeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
