-- musfyr print core schema (Phase 1: catalogue, identity, content, audit).
-- E-mail addresses are normalised to lower case by the application and unique on lower(email).
-- Money is stored as integer minor units (e.g. grosze for PLN) plus an ISO-4217 currency code.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id                UUID PRIMARY KEY,
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255),
    display_name      VARCHAR(120) NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE', 'LOCKED', 'PENDING_DELETION', 'DELETED')),
    email_verified_at TIMESTAMPTZ,
    failed_logins     INT          NOT NULL DEFAULT 0,
    locked_until      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));

CREATE TABLE user_roles (
    user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role    VARCHAR(30) NOT NULL
            CHECK (role IN ('CUSTOMER', 'ADMIN', 'DESIGNER', 'PRODUCTION', 'SUPPORT')),
    PRIMARY KEY (user_id, role)
);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id             UUID PRIMARY KEY,
    parent_id      UUID REFERENCES categories (id) ON DELETE SET NULL,
    slug           VARCHAR(80)  NOT NULL UNIQUE,
    name           VARCHAR(120) NOT NULL,
    description    TEXT,
    product_family VARCHAR(20)  NOT NULL CHECK (product_family IN ('APPAREL', 'STICKER', 'MERCH')),
    accent_hex     VARCHAR(7),
    sort_order     INT          NOT NULL DEFAULT 0,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_parent ON categories (parent_id);

CREATE TABLE colors (
    id         UUID PRIMARY KEY,
    code       VARCHAR(40) NOT NULL UNIQUE,
    name       VARCHAR(80) NOT NULL,
    hex        VARCHAR(7)  NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
    sort_order INT         NOT NULL DEFAULT 0
);

CREATE TABLE print_methods (
    id          UUID PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL UNIQUE,
    name        VARCHAR(80)  NOT NULL,
    description TEXT,
    active      BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
    id                   UUID PRIMARY KEY,
    category_id          UUID         NOT NULL REFERENCES categories (id),
    slug                 VARCHAR(120) NOT NULL UNIQUE,
    name                 VARCHAR(160) NOT NULL,
    short_description    VARCHAR(300),
    description          TEXT,
    product_family       VARCHAR(20)  NOT NULL CHECK (product_family IN ('APPAREL', 'STICKER', 'MERCH')),
    garment_type         VARCHAR(30)  NOT NULL DEFAULT 'NONE',
    age_group            VARCHAR(20)  NOT NULL DEFAULT 'NA'
                         CHECK (age_group IN ('BABY', 'TODDLER', 'KIDS', 'TEEN', 'ADULT', 'NA')),
    gender               VARCHAR(20)  NOT NULL DEFAULT 'NA'
                         CHECK (gender IN ('MEN', 'WOMEN', 'UNISEX', 'NA')),
    fit                  VARCHAR(20)  NOT NULL DEFAULT 'NA'
                         CHECK (fit IN ('REGULAR', 'SLIM', 'FITTED', 'OVERSIZED', 'RELAXED', 'NA')),
    material             VARCHAR(200),
    base_price_minor     BIGINT       NOT NULL CHECK (base_price_minor >= 0),
    compare_at_minor     BIGINT CHECK (compare_at_minor IS NULL OR compare_at_minor >= 0),
    currency             VARCHAR(3)      NOT NULL,
    production_days_min  INT          NOT NULL DEFAULT 2,
    production_days_max  INT          NOT NULL DEFAULT 5,
    customizable         BOOLEAN      NOT NULL DEFAULT TRUE,
    featured             BOOLEAN      NOT NULL DEFAULT FALSE,
    status               VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    tags                 TEXT[]       NOT NULL DEFAULT '{}',
    model_key            VARCHAR(80),
    rating_avg           NUMERIC(3, 2) NOT NULL DEFAULT 0,
    rating_count         INT          NOT NULL DEFAULT 0,
    version              BIGINT       NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    search_vector        TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(short_description, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C')
    ) STORED,
    CHECK (production_days_min <= production_days_max)
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_status_family ON products (status, product_family);
CREATE INDEX idx_products_featured ON products (featured) WHERE featured;
CREATE INDEX idx_products_search ON products USING GIN (search_vector);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_tags ON products USING GIN (tags);

CREATE TABLE product_images (
    id         UUID PRIMARY KEY,
    product_id UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    color_id   UUID REFERENCES colors (id),
    url        VARCHAR(500) NOT NULL,
    alt_text   VARCHAR(200) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images (product_id);

-- Colours a product is offered in (drives the colour picker and the variant matrix).
CREATE TABLE product_colors (
    product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    color_id   UUID NOT NULL REFERENCES colors (id),
    sort_order INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, color_id)
);

-- Sellable SKUs. size_code is the supplier/manufacturer size label (e.g. "M", "3-6M", "7.5x7.5CM").
-- Regional size labels and measurements are layered on top in the sizing module (Phase 2).
CREATE TABLE product_variants (
    id               UUID PRIMARY KEY,
    product_id       UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sku              VARCHAR(64)  NOT NULL UNIQUE,
    color_id         UUID REFERENCES colors (id),
    size_code        VARCHAR(30)  NOT NULL,
    size_sort        INT          NOT NULL DEFAULT 0,
    price_minor      BIGINT CHECK (price_minor IS NULL OR price_minor >= 0),
    stock_quantity   INT          NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    track_inventory  BOOLEAN      NOT NULL DEFAULT TRUE,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    version          BIGINT       NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (product_id, color_id, size_code)
);
CREATE INDEX idx_variants_product ON product_variants (product_id);

-- Generic, data-driven option groups (material, finish, sticker shape, sticker size, ...).
CREATE TABLE product_option_groups (
    id         UUID PRIMARY KEY,
    product_id UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    code       VARCHAR(40) NOT NULL,
    name       VARCHAR(80) NOT NULL,
    required   BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order INT         NOT NULL DEFAULT 0,
    UNIQUE (product_id, code)
);

CREATE TABLE product_option_values (
    id                UUID PRIMARY KEY,
    group_id          UUID        NOT NULL REFERENCES product_option_groups (id) ON DELETE CASCADE,
    code              VARCHAR(40) NOT NULL,
    label             VARCHAR(80) NOT NULL,
    price_delta_minor BIGINT      NOT NULL DEFAULT 0,
    sort_order        INT         NOT NULL DEFAULT 0,
    UNIQUE (group_id, code)
);

CREATE TABLE product_print_methods (
    product_id        UUID   NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    print_method_id   UUID   NOT NULL REFERENCES print_methods (id),
    price_delta_minor BIGINT NOT NULL DEFAULT 0,
    is_default        BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, print_method_id)
);

-- Printable zones with physical dimensions; used by the design studio and print-file generation.
CREATE TABLE print_areas (
    id                UUID PRIMARY KEY,
    product_id        UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    code              VARCHAR(30) NOT NULL,
    name              VARCHAR(80) NOT NULL,
    width_mm          INT         NOT NULL CHECK (width_mm > 0),
    height_mm         INT         NOT NULL CHECK (height_mm > 0),
    safe_margin_mm    INT         NOT NULL DEFAULT 5,
    min_dpi           INT         NOT NULL DEFAULT 150,
    price_delta_minor BIGINT      NOT NULL DEFAULT 0,
    sort_order        INT         NOT NULL DEFAULT 0,
    UNIQUE (product_id, code)
);

CREATE TABLE collections (
    id          UUID PRIMARY KEY,
    slug        VARCHAR(80)  NOT NULL UNIQUE,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    kind        VARCHAR(20)  NOT NULL DEFAULT 'CURATED'
                CHECK (kind IN ('CURATED', 'GIFT', 'FAMILY', 'BUSINESS', 'SEASONAL')),
    accent_hex  VARCHAR(7),
    sort_order  INT          NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE collection_products (
    collection_id UUID NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sort_order    INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Content, engagement and leads
-- ---------------------------------------------------------------------------
-- Displayed promotions. Redemption rules are enforced by the pricing service (Phase 3).
CREATE TABLE promotions (
    id             UUID PRIMARY KEY,
    code           VARCHAR(40)  UNIQUE,
    title          VARCHAR(120) NOT NULL,
    description    VARCHAR(300),
    discount_type  VARCHAR(20)  NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED', 'FREE_SHIPPING')),
    discount_value BIGINT       NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
    min_order_minor BIGINT      NOT NULL DEFAULT 0,
    currency       VARCHAR(3),
    starts_at      TIMESTAMPTZ,
    ends_at        TIMESTAMPTZ,
    public_banner  BOOLEAN      NOT NULL DEFAULT FALSE,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE product_reviews (
    id                UUID PRIMARY KEY,
    product_id        UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    user_id           UUID REFERENCES users (id) ON DELETE SET NULL,
    author_name       VARCHAR(80)  NOT NULL,
    rating            SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title             VARCHAR(120),
    body              TEXT,
    verified_purchase BOOLEAN      NOT NULL DEFAULT FALSE,
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product_status ON product_reviews (product_id, status);

CREATE TABLE newsletter_subscriptions (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING_CONFIRMATION'
                  CHECK (status IN ('PENDING_CONFIRMATION', 'SUBSCRIBED', 'UNSUBSCRIBED')),
    source        VARCHAR(40),
    locale        VARCHAR(10),
    consent_text  VARCHAR(500) NOT NULL,
    consent_at    TIMESTAMPTZ NOT NULL,
    confirmed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_newsletter_email ON newsletter_subscriptions (lower(email));

-- Bulk / corporate / team merchandise quotation requests.
CREATE TABLE quote_requests (
    id               UUID PRIMARY KEY,
    reference        VARCHAR(20)  NOT NULL UNIQUE,
    contact_name     VARCHAR(120) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    phone            VARCHAR(40),
    company          VARCHAR(160),
    product_interest VARCHAR(160) NOT NULL,
    quantity         INT          NOT NULL CHECK (quantity > 0),
    needed_by        DATE,
    message          TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'NEW'
                     CHECK (status IN ('NEW', 'IN_REVIEW', 'QUOTED', 'WON', 'LOST')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_requests_status ON quote_requests (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action      VARCHAR(60)  NOT NULL,
    entity_type VARCHAR(60)  NOT NULL,
    entity_id   VARCHAR(64),
    details     JSONB,
    ip_address  VARCHAR(64),
    correlation_id VARCHAR(64),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
