-- ============================================================================
-- V6: Campos de auditoría de usuario + tabla audit_log
-- ============================================================================
-- Agrega created_by y updated_by a todas las entidades que extienden BaseEntity,
-- y crea la tabla audit_log para registrar operaciones sensibles.
-- ============================================================================

-- ============================================================================
-- PARTE 1: Columnas created_by / updated_by en entidades de BaseEntity
-- (Nullable porque las filas existentes no tienen usuario asignado aún)
-- ============================================================================

ALTER TABLE patients           ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE patients           ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE doctors            ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE doctors            ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE insurance_policies  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE insurance_policies  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE appointments        ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE appointments        ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE medical_records     ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE medical_records     ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE diagnoses           ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE diagnoses           ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE prescriptions       ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE prescriptions       ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE procedures          ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE procedures          ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE services_catalog    ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE services_catalog    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE medications_catalog ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE medications_catalog ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE invoices            ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE invoices            ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE invoice_items       ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE invoice_items       ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

ALTER TABLE payments            ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE payments            ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- ============================================================================
-- PARTE 2: Tabla audit_log para operaciones sensibles
-- Registra CREATE y UPDATE en Diagnosis, Prescription e Invoice
-- ============================================================================

CREATE TABLE audit_log (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name  VARCHAR(100) NOT NULL,
    entity_id    UUID         NOT NULL,
    action       VARCHAR(20)  NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    old_values   JSONB,
    new_values   JSONB,

    CONSTRAINT chk_audit_action CHECK (action IN ('CREATE', 'UPDATE'))
);

COMMENT ON TABLE  audit_log              IS 'Registro de auditoría de operaciones sensibles (RN-22).';
COMMENT ON COLUMN audit_log.entity_name  IS 'Nombre de la entidad afectada: Diagnosis, Prescription, Invoice.';
COMMENT ON COLUMN audit_log.entity_id    IS 'UUID de la entidad afectada.';
COMMENT ON COLUMN audit_log.action       IS 'Tipo de operación: CREATE o UPDATE.';
COMMENT ON COLUMN audit_log.performed_by IS 'Username del usuario autenticado que realizó la operación.';
COMMENT ON COLUMN audit_log.old_values   IS 'Estado anterior de la entidad en JSON. Null en operaciones CREATE.';
COMMENT ON COLUMN audit_log.new_values   IS 'Estado nuevo de la entidad en JSON. Null en eliminaciones.';

-- Índices para consultas frecuentes de auditoría
CREATE INDEX idx_audit_log_entity      ON audit_log(entity_name, entity_id);
CREATE INDEX idx_audit_log_performed_at ON audit_log(performed_at DESC);
CREATE INDEX idx_audit_log_performed_by ON audit_log(performed_by);
