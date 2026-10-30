import { CircleCheck, Clock, Heart, LayoutGrid, Settings } from 'lucide-react'
import type { NavItem } from '../../components/AppLayout'

export const USER_NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/app/checkin', label: 'Check-in', icon: CircleCheck },
  { to: '/app/historico', label: 'Histórico', icon: Clock },
  { to: '/app/bem-estar', label: 'Central de Bem-estar', icon: Heart },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings },
]
