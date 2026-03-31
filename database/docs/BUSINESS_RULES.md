# REGLAS DE NEGOCIO - Sistema de Facturación Médica y Expediente Clínico (EHR Lite)

## ENTIDADES PRINCIPALES

1. **PATIENTS** - Pacientes del sistema
2. **DOCTORS** - Personal médico
3. **APPOINTMENTS** - Citas/consultas médicas
4. **MEDICAL_RECORDS** - Expediente clínico (historia por consulta)
5. **DIAGNOSES** - Diagnósticos (CIE-10/ICD-10)
6. **PRESCRIPTIONS** - Recetas médicas
7. **PROCEDURES** - Procedimientos realizados
8. **INVOICES** - Facturas
9. **INVOICE_ITEMS** - Conceptos de facturación
10. **PAYMENTS** - Pagos aplicados a facturas
11. **INSURANCE_PROVIDERS** - Aseguradoras
12. **INSURANCE_POLICIES** - Pólizas de seguro de pacientes
13. **SERVICES_CATALOG** - Catálogo de servicios médicos
14. **MEDICATIONS_CATALOG** - Catálogo de medicamentos

---

## REGLAS DE NEGOCIO CRÍTICAS

### Pacientes y Citas
- **RN-01:** Un paciente debe tener DNI/identificación única antes de ser atendido.
- **RN-02:** Una cita debe tener paciente + médico + fecha/hora asignados.
- **RN-03:** Una cita puede tener estados: `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`.
- **RN-04:** No se puede eliminar un paciente si tiene citas o facturas pendientes (integridad referencial).

### Expediente Clínico
- **RN-05:** Cada consulta completada debe generar un registro en `MEDICAL_RECORDS`.
- **RN-06:** Los diagnósticos deben usar códigos ICD-10 estándar.
- **RN-07:** Las prescripciones deben incluir: medicamento, dosis, frecuencia, duración.
- **RN-08:** El expediente clínico es inmutable (no se puede eliminar, solo añadir correcciones/enmiendas).

### Facturación
- **RN-09:** Una factura se genera automáticamente al completar una cita.
- **RN-10:** Una factura puede tener estados: `draft`, `pending`, `partial_paid`, `paid`, `cancelled`, `overdue`.
- **RN-11:** El total de la factura = subtotal + impuestos.
- **RN-12:** Si hay seguro activo, la factura se divide en: `insurance_coverage` + `patient_responsibility`.
- **RN-13:** La suma de pagos no puede exceder el total de la factura.
- **RN-14:** No se puede eliminar una factura si tiene pagos aplicados (usar soft delete con `cancelled` status).

### Seguros
- **RN-15:** Una póliza de seguro debe estar activa (`is_active=true`) y dentro del rango de fechas (`start_date` <= HOY <= `end_date`) para ser válida.
- **RN-16:** El porcentaje de cobertura del seguro debe estar entre 0-100%.
- **RN-17:** Un paciente puede tener múltiples pólizas, pero solo una puede usarse por factura.

### Catálogos
- **RN-18:** Los precios de servicios y medicamentos deben tener auditoría de cambios (trigger para historial).
- **RN-19:** Solo se pueden facturar servicios/medicamentos activos (`is_active=true`).
- **RN-20:** Los medicamentos con `requires_prescription=true` solo pueden facturarse si existe una prescripción válida.

### Auditoría
- **RN-21:** Todas las tablas deben tener `created_at` y `updated_at` (excepto tablas de solo inserción como pagos).
- **RN-22:** Los cambios en datos sensibles (diagnósticos, prescripciones, facturas) deben quedar registrados (considerar tabla de auditoría).

---

## RELACIONES CLAVE

### Cardinalidad
- Un **Paciente** tiene múltiples **Citas** (1:N)
- Un **Médico** atiende múltiples **Citas** (1:N)
- Una **Cita** genera un **Expediente Clínico** (1:1)
- Un **Expediente Clínico** puede tener múltiples **Diagnósticos** (1:N)
- Un **Expediente Clínico** puede tener múltiples **Prescripciones** (1:N)
- Un **Expediente Clínico** puede tener múltiples **Procedimientos** (1:N)
- Una **Cita** genera una **Factura** (1:1)
- Una **Factura** contiene múltiples **Conceptos de Facturación** (1:N)
- Una **Factura** puede tener múltiples **Pagos** (1:N)
- Un **Paciente** puede tener múltiples **Pólizas de Seguro** (1:N)
- Una **Aseguradora** emite múltiples **Pólizas** (1:N)
- Una **Factura** puede estar cubierta por una **Póliza** (N:1, opcional)

### Integridad Referencial
- **ON DELETE RESTRICT:** Pacientes, Médicos, Aseguradoras (no se pueden eliminar si tienen registros dependientes)
- **ON DELETE CASCADE:** Conceptos de factura (si se elimina una factura, se eliminan sus items)
- **ON DELETE SET NULL:** Póliza de seguro en factura (si se elimina la póliza, la factura queda sin seguro pero sigue existiendo)
