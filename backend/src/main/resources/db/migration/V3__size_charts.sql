-- International sizing. A chart belongs to one product and holds that product's measurements per supplier size.
-- Regional labels are per row (never computed by converting between countries), because labels do not map
-- exactly between systems; measurements decide.
CREATE TABLE size_charts (
    id            UUID PRIMARY KEY,
    product_id    UUID        NOT NULL UNIQUE REFERENCES products (id) ON DELETE CASCADE,
    source        VARCHAR(20) NOT NULL DEFAULT 'REFERENCE' CHECK (source IN ('REFERENCE', 'SUPPLIER')),
    supplier_name VARCHAR(120),
    fit_note      VARCHAR(300),
    i18n          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Body measurement ranges (for recommendations) and flat garment measurements, all in centimetres.
CREATE TABLE size_chart_rows (
    id               UUID PRIMARY KEY,
    chart_id         UUID          NOT NULL REFERENCES size_charts (id) ON DELETE CASCADE,
    size_code        VARCHAR(30)   NOT NULL,
    sort_order       INT           NOT NULL DEFAULT 0,
    age_min_months   INT,
    age_max_months   INT,
    height_min       NUMERIC(5, 1),
    height_max       NUMERIC(5, 1),
    chest_min        NUMERIC(5, 1),
    chest_max        NUMERIC(5, 1),
    waist_min        NUMERIC(5, 1),
    waist_max        NUMERIC(5, 1),
    garment_width    NUMERIC(5, 1),
    garment_length   NUMERIC(5, 1),
    labels           JSONB         NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (chart_id, size_code),
    CHECK (height_min IS NULL OR height_max IS NULL OR height_min <= height_max),
    CHECK (chest_min IS NULL OR chest_max IS NULL OR chest_min <= chest_max)
);
CREATE INDEX idx_size_chart_rows_chart ON size_chart_rows (chart_id, sort_order);
