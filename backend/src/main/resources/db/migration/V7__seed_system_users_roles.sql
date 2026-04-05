-- ============================================================================
-- V7 - Seed de usuarios por rol para pruebas funcionales
-- ============================================================================

-- Contrasena: doctor123
INSERT INTO system_users (username, password_hash, email, role, is_active)
SELECT
    'doctor1',
    crypt('doctor123', gen_salt('bf', 10)),
    'doctor1@sfm.local',
    'DOCTOR',
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM system_users
    WHERE username = 'doctor1' OR email = 'doctor1@sfm.local'
);

-- Contrasena: recep123
INSERT INTO system_users (username, password_hash, email, role, is_active)
SELECT
    'recep1',
    crypt('recep123', gen_salt('bf', 10)),
    'recep1@sfm.local',
    'RECEPTIONIST',
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM system_users
    WHERE username = 'recep1' OR email = 'recep1@sfm.local'
);
