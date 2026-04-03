import { useAuthPermissions } from './useAuthPermissions'

const ADMIN = 'ADMIN' as const
const DOCTOR = 'DOCTOR' as const
const RECEPTIONIST = 'RECEPTIONIST' as const

export const NO_PERMISSION_MESSAGE = 'No tienes permisos para esta acción.'

export function useRolePermissions() {
  const { hasRole, hasAnyRole, session } = useAuthPermissions()

  return {
    role: session.role,
    canManagePatients: hasAnyRole([ADMIN, RECEPTIONIST]),
    canManageDoctors: hasRole(ADMIN),
    canManageInvoices: hasRole(ADMIN),
    canManageInsurance: hasRole(ADMIN),
    canManageCatalog: hasRole(ADMIN),
    canRegisterPayments: hasAnyRole([ADMIN, RECEPTIONIST]),
    canCompleteAppointment: hasRole(DOCTOR),
  }
}
