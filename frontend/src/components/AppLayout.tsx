import type { ComponentType, ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, LogOut, Server } from 'lucide-react'
import { Logo } from './Logo'
import { canAccess, initials, ROLE_LABEL, roleOf, useAuth, type Area } from '../context/AuthContext'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number }>
  end?: boolean
}

interface AppLayoutProps {
  nav: NavItem[]
  variant?: 'dark' | 'light'
  sectionLabel?: string
  backTo?: string
  sidebarExtra?: ReactNode
  internalNote?: boolean
}

export function AppLayout({ nav, variant = 'dark', sectionLabel, backTo, sidebarExtra, internalNote }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const name = user?.name ?? ''

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={`shell ${variant}`}>
      <aside className="sidebar">
        {backTo ? (
          <button className="back-btn" onClick={() => navigate(backTo)} aria-label="Voltar">
            <ArrowLeft size={16} />
          </button>
        ) : (
          <Logo variant="light" />
        )}
        {sectionLabel && <div className="section-label">{sectionLabel}</div>}
        <nav className="nav">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        {sidebarExtra}
        <div className="footer">
          <AreaSwitcher />
          {internalNote && (
            <div className="internal-note">
              <Lock size={12} />
              <div>Painel interno. Não disponível para clientes, RH ou colaboradores.</div>
            </div>
          )}
          <div className="user-box">
            <div className={`avatar${variant === 'light' ? ' light' : ''}`}>{initials(name)}</div>
            <div>
              <div className="name">{name}</div>
              <div className="role">{ROLE_LABEL[roleOf(user)]}</div>
            </div>
            <button className="logout" onClick={handleLogout} aria-label="Sair">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const AREA_OPTIONS: { area: Area; label: string; to: string }[] = [
  { area: 'gestao', label: 'Gestão', to: '/gestao' },
  { area: 'clientes', label: 'Cadastro de clientes', to: '/clientes' },
  { area: 'dev', label: 'Desenvolvimento', to: '/dev' },
  { area: 'app', label: 'Colaborador', to: '/app' },
]

// Troca de área para perfis com acesso a mais de uma (ex.: admin).
function AreaSwitcher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const current = useLocation().pathname.split('/')[1]
  const options = AREA_OPTIONS.filter((o) => canAccess(user, o.area) && o.area !== 'clientes')
  if (options.length < 2) return null
  return (
    <select className="area-switch" value={current} onChange={(e) => navigate(`/${e.target.value}`)} aria-label="Área">
      {options.map((o) => (
        <option key={o.area} value={o.area}>{o.label}</option>
      ))}
      {current === 'clientes' && <option value="clientes">Cadastro de clientes</option>}
    </select>
  )
}

export function EnvBox() {
  return (
    <div className="env-box">
      <Server size={16} />
      <div>
        <small>Ambiente</small>
        Produção · SaaS
      </div>
    </div>
  )
}
