import { NavLink } from 'react-router-dom'
import { Building2, User, Users } from 'lucide-react'
import { AppLayout, type NavItem } from '../../components/AppLayout'

const NAV: NavItem[] = [
  { to: '/clientes', label: 'Clientes', icon: Users, end: true },
  { to: '/clientes/pessoa-fisica', label: 'Pessoa Física', icon: User },
  { to: '/clientes/pessoa-juridica', label: 'Pessoa Jurídica', icon: Building2 },
]

export function ClientsLayout() {
  return <AppLayout nav={NAV} variant="light" backTo="/gestao/usuarios" />
}

// Abas no topo das telas 5.1, 5.2 e 5.3.
export function ClientTabs() {
  const tabs = [
    { to: '/clientes/pessoa-fisica', label: 'Pessoa Física' },
    { to: '/clientes/pessoa-juridica', label: 'Pessoa Jurídica' },
    { to: '/clientes', label: 'Pessoas Cadastradas' },
  ]
  return (
    <div className="tabs-bar mt-16" style={{ marginBottom: 20 }}>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end>{t.label}</NavLink>
      ))}
    </div>
  )
}

export function ClientTitle({ children }: { children: string }) {
  return <h1 className="title-underline" style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{children}</h1>
}
