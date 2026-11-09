-- ============================================================================
-- V12 - Familias de refresh tokens y deteccion de reuso
-- ============================================================================
-- Cada login crea una familia. Los refresh tokens rotan dentro de la familia.
-- Si un token ya usado se vuelve a presentar fuera de la ventana de gracia,
-- se revoca la familia completa y la sesion queda cerrada.
-- ============================================================================

CREATE TABLE refresh_token_families (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ,
    revoke_reason VARCHAR(40),

    CONSTRAINT fk_refresh_token_families_user FOREIGN KEY (user_id)
        REFERENCES system_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_token_families_user ON refresh_token_families (user_id);
CREATE INDEX idx_refresh_token_families_revoked ON refresh_token_families (revoked_at);

COMMENT ON TABLE refresh_token_families IS
    'Sesiones de refresh. Un login = una familia; el reuso de un token rotado revoca la familia.';
COMMENT ON COLUMN refresh_token_families.revoke_reason IS
    'logout | reuse | expired';

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id   UUID        NOT NULL,
    jti         UUID        NOT NULL UNIQUE,
    token_hash  CHAR(64)    NOT NULL,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ,

    CONSTRAINT fk_refresh_tokens_family FOREIGN KEY (family_id)
        REFERENCES refresh_token_families(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

COMMENT ON TABLE refresh_tokens IS
    'Refresh tokens emitidos. Solo se guarda el SHA-256 del JWT, nunca el token en claro.';
COMMENT ON COLUMN refresh_tokens.token_hash IS
    'SHA-256 hexadecimal del JWT completo.';
COMMENT ON COLUMN refresh_tokens.used_at IS
    'Momento en que el token se canjeo. Reusarlo fuera de la ventana de gracia revoca la familia.';
