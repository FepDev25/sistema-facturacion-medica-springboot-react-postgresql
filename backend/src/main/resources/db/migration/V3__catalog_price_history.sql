-- ============================================================================
-- V3__catalog_price_history.sql
-- ============================================================================
-- Tabla de auditoría de cambios de precios (RN-18).
-- Nota: La lógica de inserción en esta tabla se gestiona desde la capa
-- de aplicación (Java), no mediante triggers de base de datos.
-- ============================================================================

CREATE TABLE catalog_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    catalog_type VARCHAR(20) NOT NULL,
    catalog_id UUID NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    old_price NUMERIC(10, 2) NOT NULL,
    new_price NUMERIC(10, 2) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_catalog_price_history_type CHECK (catalog_type IN ('service', 'medication'))
);

CREATE INDEX idx_catalog_price_history_catalog_id ON catalog_price_history(catalog_id);
CREATE INDEX idx_catalog_price_history_changed_at ON catalog_price_history(changed_at);

COMMENT ON TABLE catalog_price_history IS 'RN-18: Auditoría de cambios de precios en catálogos de servicios y medicamentos';
COMMENT ON COLUMN catalog_price_history.catalog_type IS 'Tipo de catálogo afectado: service o medication';
COMMENT ON COLUMN catalog_price_history.catalog_id IS 'UUID del ítem del catálogo cuyo precio fue modificado';
