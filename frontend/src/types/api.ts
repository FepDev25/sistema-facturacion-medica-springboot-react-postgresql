// Tipos generados desde backend/openapi/openapi.yaml con `npm run generate:types`.
//
// `api-generated.ts` es la fuente de verdad del contrato HTTP. Los tipos de
// `src/types/*` son modelos de vista del frontend (campos planos, etiquetas y
// valores derivados); cuando una respuesta de la API se mapea a un modelo de
// vista, la capa `api/` debe tipar el payload con estos alias.
import type { components } from './api-generated'

export type ApiSchemas = components['schemas']

export type ApiInvoiceResponse = ApiSchemas['InvoiceResponse']
export type ApiInvoiceViewResponse = ApiSchemas['InvoiceViewResponse']
export type ApiInvoiceListViewResponse = ApiSchemas['InvoiceListViewResponse']
export type ApiInvoiceItemView = ApiSchemas['InvoiceItemView']
export type ApiPaymentResponse = ApiSchemas['PaymentResponse']
