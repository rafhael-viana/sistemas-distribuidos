import { CircleCheck, Clock, FileClock, Heart, LayoutGrid, Settings, Users } from 'lucide-react'
import type { NavItem } from '../../components/AppLayout'

export const ADMIN_NAV: NavItem[] = [
  { to: '/gestao', label: 'Dashboard Gerencial', icon: LayoutGrid, end: true },
  { to: '/gestao/ciclos', label: 'Ciclos de Pesquisa', icon: CircleCheck },
  { to: '/gestao/relatorios', label: 'Relatórios & Export', icon: Clock },
  { to: '/gestao/mensagens', label: 'Mensagens Preventivas', icon: Heart },
  { to: '/gestao/usuarios', label: 'Usuários e Equipes', icon: Users },
  { to: '/gestao/parametros', label: 'Parâmetros', icon: Settings },
  { to: '/gestao/auditoria', label: 'Trilha de Auditoria', icon: FileClock },
]
