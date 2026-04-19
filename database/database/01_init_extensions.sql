-- ============================================================================
-- 00_init.sql - Sistema de Facturación Médica y Expediente Clínico (EHR Lite)
-- ============================================================================
-- Extensiones requeridas para el sistema
-- ============================================================================

-- Extensión para generación de UUIDs v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensión para funciones criptográficas (útil para hashing de datos sensibles)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Comentarios de documentación
COMMENT ON EXTENSION "uuid-ossp" IS 'Generación de identificadores únicos UUID v4 para todas las tablas';
COMMENT ON EXTENSION "pgcrypto" IS 'Funciones criptográficas para seguridad de datos sensibles';
