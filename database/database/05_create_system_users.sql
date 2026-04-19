-- ============================================================================
-- V5 - Tabla de usuarios del sistema para autenticacion JWT
-- ============================================================================

CREATE TABLE system_users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    role          VARCHAR(20)  NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  system_users              IS 'Usuarios internos del sistema con acceso a la API';
COMMENT ON COLUMN system_users.role         IS 'ADMIN | DOCTOR | RECEPTIONIST';
COMMENT ON COLUMN system_users.password_hash IS 'BCrypt hash de la contraseña';

-- Indice para el lookup de autenticacion (username es UNIQUE pero el indice explicito mejora el plan)
CREATE INDEX idx_system_users_username ON system_users (username);
CREATE INDEX idx_system_users_role     ON system_users (role);

-- ============================================================================
-- Seed: usuario administrador por defecto (solo para desarrollo)
-- Hash generado con pgcrypto en el momento de la migracion.
-- Contrasena: admin123
-- ============================================================================
INSERT INTO system_users (username, password_hash, email, role, is_active)
VALUES (
    'admin',
    crypt('admin123', gen_salt('bf', 10)),
    'admin@sfm.local',
    'ADMIN',
    true
);
