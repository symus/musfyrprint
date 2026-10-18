-- Translatable catalogue content.
-- Base columns hold the base content language (English). Translations live in an `i18n` JSONB column per row:
--   {"pl": {"name": "...", "short_description": "...", "description": "..."}, "de": {...}}
-- Adding a market language therefore needs data, not schema changes. Reads use COALESCE(i18n->lang->>field, base).

ALTER TABLE products              ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE categories            ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE collections           ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE colors                ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE print_methods         ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE print_areas           ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE product_option_groups ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE product_option_values ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE promotions            ADD COLUMN i18n JSONB NOT NULL DEFAULT '{}'::jsonb;

-- All translations of one field, space separated (used for multilingual full-text search).
CREATE FUNCTION i18n_all(doc JSONB, field TEXT) RETURNS TEXT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT coalesce(string_agg(value ->> field, ' '), '') FROM jsonb_each(doc) $$;

ALTER TABLE products DROP COLUMN search_vector;
ALTER TABLE products ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '') || ' ' || i18n_all(i18n, 'name')), 'A') ||
    setweight(to_tsvector('simple', coalesce(short_description, '') || ' ' || i18n_all(i18n, 'short_description')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '') || ' ' || i18n_all(i18n, 'description')), 'C')
) STORED;
CREATE INDEX idx_products_search ON products USING GIN (search_vector);
