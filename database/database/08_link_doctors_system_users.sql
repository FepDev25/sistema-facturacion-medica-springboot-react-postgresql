-- ============================================================================
-- V9 - Vincular doctores con usuarios del sistema (system_users)
-- ============================================================================
-- Agrega user_id nullable a doctors, permitiendo vincular un SystemUser (rol DOCTOR)
-- con un Doctor del dominio. Esto permite autorizar operaciones especificas del
-- doctor autenticado (ej: completar citas) contra el doctor dueño de la cita.
-- ============================================================================

ALTER TABLE doctors
    ADD COLUMN user_id UUID NULL;

ALTER TABLE doctors
    ADD CONSTRAINT fk_doctors_user
        FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE SET NULL;

ALTER TABLE doctors
    ADD CONSTRAINT uq_doctors_user_id UNIQUE (user_id);

CREATE INDEX idx_doctors_user_id ON doctors(user_id);

COMMENT ON COLUMN doctors.user_id IS 'Referencia al usuario del sistema vinculado. Permite al doctor autenticado operar sobre sus propias citas.';

-- ============================================================================
-- Vincular doctor1 (system_user) con el primer doctor de seeds
-- ============================================================================
UPDATE doctors
SET user_id = su.id
FROM system_users su
WHERE su.username = 'doctor1'
  AND doctors.license_number = 'MED-001-2015';
