// Enums persisted as lowercase strings (AttributeConverter on backend)

export type Gender =
  | 'male'
  | 'female'
  | 'other'
  | 'prefer_not_to_say'

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'partial_paid'
  | 'paid'
  | 'cancelled'
  | 'overdue'

export type Severity =
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'critical'

export type ItemType =
  | 'service'
  | 'medication'
  | 'procedure'
  | 'other'

export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'check'
  | 'insurance'
  | 'other'

export type ServiceCategory =
  | 'consultation'
  | 'laboratory'
  | 'imaging'
  | 'surgery'
  | 'therapy'
  | 'emergency'
  | 'other'

export type MedicationUnit =
  | 'tablet'
  | 'capsule'
  | 'ml'
  | 'mg'
  | 'g'
  | 'unit'
  | 'box'
  | 'vial'
  | 'inhaler'

export type CatalogType = 'service' | 'medication'

// Display labels for UI rendering
export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
  prefer_not_to_say: 'Prefiero no decir',
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  partial_paid: 'Pago parcial',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  overdue: 'Vencida',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  mild: 'Leve',
  moderate: 'Moderado',
  severe: 'Severo',
  critical: 'Crítico',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  bank_transfer: 'Transferencia bancaria',
  check: 'Cheque',
  insurance: 'Seguro',
  other: 'Otro',
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  consultation: 'Consulta',
  laboratory: 'Laboratorio',
  imaging: 'Imagenología',
  surgery: 'Cirugía',
  therapy: 'Terapia',
  emergency: 'Urgencias',
  other: 'Otro',
}

export const MEDICATION_UNIT_LABELS: Record<MedicationUnit, string> = {
  tablet: 'Tableta',
  capsule: 'Cápsula',
  ml: 'mL',
  mg: 'mg',
  g: 'g',
  unit: 'Unidad',
  box: 'Caja',
  vial: 'Vial',
  inhaler: 'Inhalador',
}
