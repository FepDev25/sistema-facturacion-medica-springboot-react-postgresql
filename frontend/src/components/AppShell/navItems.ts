import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Shield,
  Stethoscope,
  Users,
} from 'lucide-react'
import type { AuthRole } from '@/features/auth/api/authApi'

export interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: AuthRole[]
}

export const ALL_NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  { to: '/patients', label: 'Pacientes', icon: Users, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/doctors', label: 'Médicos', icon: Stethoscope, roles: ['ADMIN'] },
  {
    to: '/appointments',
    label: 'Citas',
    icon: CalendarDays,
    roles: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  },
  { to: '/invoices', label: 'Facturas', icon: CreditCard, roles: ['ADMIN', 'RECEPTIONIST'] },
  { to: '/insurance', label: 'Seguros', icon: Shield, roles: ['ADMIN'] },
  { to: '/catalog', label: 'Catálogo', icon: ClipboardList, roles: ['ADMIN'] },
]
