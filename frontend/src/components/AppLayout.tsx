import type { ComponentType, ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, LogOut, Server } from 'lucide-react'
import { Logo } from './Logo'
import { initials, useAuth } from '../context/AuthContext'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number }>
  end?: boolean
}

interface AppLayoutProps {
  nav: NavItem[]
  role: string
  // Nome exibido quando o perfil não vem do backend (ex.: gestor e dev do protótipo).
  fallbackName: string
  variant?: 'dark' | 'light'
  sectionLabel?: string
  backTo?: string
  sidebarExtra?: ReactNode
  internalNote?: boolean
}

export function AppLayout({ nav, role, fallbackName, variant = 'dark', sectionLabel, backTo, sidebarExtra, internalNote }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const name = user?.name ?? fallbackName

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
              <div className="role">{role}</div>
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
