import { Bug, Building } from 'lucide-react'
import type { NavItem } from '../../components/AppLayout'

export const DEV_NAV: NavItem[] = [
  { to: '/dev', label: 'Tenants / Empresas', icon: Building, end: true },
  { to: '/dev/logs', label: 'Logs Técnicos & Erros', icon: Bug },
]
