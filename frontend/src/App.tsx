import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AppLayout, EnvBox } from './components/AppLayout'
import { Landing } from './pages/public/Landing'
import { Login } from './pages/public/Login'
import { Register } from './pages/public/Register'
import { Onboarding } from './pages/onboarding/Onboarding'
import { USER_NAV } from './pages/user/nav'
import { Dashboard } from './pages/user/Dashboard'
import { Checkin } from './pages/user/Checkin'
import { Feedback } from './pages/user/Feedback'
import { History } from './pages/user/History'
import { WellnessCenter } from './pages/user/WellnessCenter'
import { Settings } from './pages/user/Settings'
import { Notifications } from './pages/user/Notifications'
import { ADMIN_NAV } from './pages/admin/nav'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { Cycles } from './pages/admin/Cycles'
import { Reports } from './pages/admin/Reports'
import { ReportRequest } from './pages/admin/ReportRequest'
import { ReportGenerating } from './pages/admin/ReportGenerating'
import { Messages } from './pages/admin/Messages'
import { Users } from './pages/admin/Users'
import { Params } from './pages/admin/Params'
import { Audit } from './pages/admin/Audit'
import { ClientsLayout } from './pages/clients/ClientsLayout'
import { ClientPF } from './pages/clients/ClientPF'
import { ClientPJ } from './pages/clients/ClientPJ'
import { ClientsList } from './pages/clients/ClientsList'
import { DEV_NAV } from './pages/dev/nav'
import { Tenants } from './pages/dev/Tenants'
import { Logs } from './pages/dev/Logs'

function RequireAuth({ children, onboarding = false }: { children: ReactNode; onboarding?: boolean }) {
  const { user, onboarded } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (onboarding && !onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, onboarded } = useAuth()
  if (user) return <Navigate to={onboarded ? '/app' : '/onboarding'} replace />
  return children
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/cadastro" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

      {/* Colaborador */}
      <Route
        path="/app"
        element={
          <RequireAuth onboarding>
            <AppLayout nav={USER_NAV} role="Engenheira de Software" fallbackName="Camila Silva" />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="checkin" element={<Checkin />} />
        <Route path="checkin/devolutiva" element={<Feedback />} />
        <Route path="historico" element={<History />} />
        <Route path="bem-estar" element={<WellnessCenter />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="notificacoes" element={<Notifications />} />
      </Route>

      {/* Gestão (RH) */}
      <Route
        path="/gestao"
        element={
          <RequireAuth>
            <AppLayout nav={ADMIN_NAV} role="Gestão de RH" fallbackName="Mariana Costa" />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="ciclos" element={<Cycles />} />
        <Route path="relatorios" element={<Reports />} />
        <Route path="relatorios/novo" element={<ReportRequest />} />
        <Route path="relatorios/gerando/:id" element={<ReportGenerating />} />
        <Route path="mensagens" element={<Messages />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="parametros" element={<Params />} />
        <Route path="auditoria" element={<Audit />} />
      </Route>

      {/* Cadastro de clientes (fluxo 5.x, aberto a partir de "Cadastrar usuários") */}
      <Route path="/clientes" element={<RequireAuth><ClientsLayout /></RequireAuth>}>
        <Route index element={<ClientsList />} />
        <Route path="pessoa-fisica" element={<ClientPF />} />
        <Route path="pessoa-juridica" element={<ClientPJ />} />
      </Route>

      {/* Desenvolvimento */}
      <Route
        path="/dev"
        element={
          <RequireAuth>
            <AppLayout nav={DEV_NAV} role="Dev/Engenharia" fallbackName="Rafael Lima" sectionLabel="Desenvolvimento" sidebarExtra={<EnvBox />} internalNote />
          </RequireAuth>
        }
      >
        <Route index element={<Tenants />} />
        <Route path="logs" element={<Logs />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
