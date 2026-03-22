import type { PaymentResponse } from '@/types/invoice'
import { PAYMENTS_BY_INVOICE } from './invoices.mock'

// lista flat de todos los pagos, ordenados por fecha descendente
export const PAYMENTS_MOCK: PaymentResponse[] = Object.values(
  PAYMENTS_BY_INVOICE,
)
  .flat()
  .sort(
    (a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
  )
