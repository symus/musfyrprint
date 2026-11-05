-- Phase 3: customer accounts, carts, pricing configuration, orders and payments.

ALTER TABLE users
    ADD COLUMN phone                 VARCHAR(40),
    ADD COLUMN marketing_opt_in      BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN preferred_size_system VARCHAR(5),
    ADD COLUMN preferred_locale      VARCHAR(5),
    ADD COLUMN terms_accepted_at     TIMESTAMPTZ,
    ADD COLUMN deletion_requested_at TIMESTAMPTZ;

CREATE TABLE customer_addresses (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    full_name   VARCHAR(120) NOT NULL,
    company     VARCHAR(160),
    line1       VARCHAR(200) NOT NULL,
    line2       VARCHAR(200),
    postal_code VARCHAR(20)  NOT NULL,
    city        VARCHAR(120) NOT NULL,
    country     VARCHAR(2)   NOT NULL,
    phone       VARCHAR(40),
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_addresses_user ON customer_addresses (user_id);

-- One-time tokens for e-mail verification and password reset (only hashes are stored).
CREATE TABLE email_tokens (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    VARCHAR(20) NOT NULL CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipping_methods (
    id                    UUID PRIMARY KEY,
    code                  VARCHAR(40)  NOT NULL UNIQUE,
    name                  VARCHAR(120) NOT NULL,
    i18n                  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    carrier               VARCHAR(40)  NOT NULL,
    price_minor           BIGINT       NOT NULL CHECK (price_minor >= 0),
    currency              VARCHAR(3)   NOT NULL,
    countries             TEXT[]       NOT NULL DEFAULT '{PL}',
    requires_pickup_point BOOLEAN      NOT NULL DEFAULT FALSE,
    days_min              INT          NOT NULL DEFAULT 1,
    days_max              INT          NOT NULL DEFAULT 3,
    active                BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order            INT          NOT NULL DEFAULT 0
);

-- Volume discounts applied per cart line (e.g. 10+ pieces of one item: 5 % off).
CREATE TABLE quantity_discount_tiers (
    min_quantity INT PRIMARY KEY CHECK (min_quantity > 1),
    percent      INT NOT NULL CHECK (percent BETWEEN 1 AND 90)
);

ALTER TABLE promotions
    ADD COLUMN max_redemptions INT,
    ADD COLUMN redemptions     INT NOT NULL DEFAULT 0;

CREATE TABLE carts (
    id              UUID PRIMARY KEY,
    user_id         UUID REFERENCES users (id) ON DELETE CASCADE,
    currency        VARCHAR(3)  NOT NULL,
    promotion_code  VARCHAR(40),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MERGED', 'CONVERTED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_carts_active_user ON carts (user_id) WHERE status = 'ACTIVE' AND user_id IS NOT NULL;

CREATE TABLE cart_items (
    id         UUID PRIMARY KEY,
    cart_id    UUID        NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
    product_id UUID        NOT NULL REFERENCES products (id),
    variant_id UUID        NOT NULL REFERENCES product_variants (id),
    design_id  UUID REFERENCES designs (id),
    quantity   INT         NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
    options    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);

CREATE SEQUENCE order_number_seq START 1001;

CREATE TABLE orders (
    id                    UUID PRIMARY KEY,
    number                VARCHAR(20)  NOT NULL UNIQUE,
    user_id               UUID REFERENCES users (id) ON DELETE SET NULL,
    cart_id               UUID REFERENCES carts (id) ON DELETE SET NULL,
    email                 VARCHAR(255) NOT NULL,
    status                VARCHAR(30)  NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'IN_PRODUCTION',
                                                                  'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED')),
    currency              VARCHAR(3)   NOT NULL,
    subtotal_minor        BIGINT       NOT NULL,
    discount_minor        BIGINT       NOT NULL DEFAULT 0,
    shipping_minor        BIGINT       NOT NULL DEFAULT 0,
    tax_minor             BIGINT       NOT NULL DEFAULT 0,
    total_minor           BIGINT       NOT NULL CHECK (total_minor >= 0),
    tax_mode              VARCHAR(20)  NOT NULL,
    promotion_code        VARCHAR(40),
    shipping_method_code  VARCHAR(40)  NOT NULL,
    pickup_point          VARCHAR(40),
    shipping_address      JSONB        NOT NULL,
    locale                VARCHAR(5)   NOT NULL DEFAULT 'pl',
    access_token_hash     VARCHAR(64)  NOT NULL,
    terms_accepted_at     TIMESTAMPTZ  NOT NULL,
    customer_note         VARCHAR(500),
    paid_at               TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    version               BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status, created_at DESC);

CREATE TABLE order_items (
    id               UUID PRIMARY KEY,
    order_id         UUID         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id       UUID         NOT NULL REFERENCES products (id),
    variant_id       UUID         NOT NULL REFERENCES product_variants (id),
    sku              VARCHAR(64)  NOT NULL,
    product_name     VARCHAR(160) NOT NULL,
    color_code       VARCHAR(40),
    size_code        VARCHAR(30)  NOT NULL,
    quantity         INT          NOT NULL CHECK (quantity > 0),
    unit_price_minor BIGINT       NOT NULL,
    line_total_minor BIGINT       NOT NULL,
    options          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    price_breakdown  JSONB        NOT NULL,
    design_id        UUID REFERENCES designs (id),
    -- Exact copy of the design at purchase time, so production never depends on later edits.
    design_snapshot  JSONB,
    print_zones      TEXT[]       NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

CREATE TABLE order_events (
    id         BIGSERIAL PRIMARY KEY,
    order_id   UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status     VARCHAR(30) NOT NULL,
    note       VARCHAR(500),
    actor      VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_events_order ON order_events (order_id, created_at);

CREATE TABLE payments (
    id                UUID PRIMARY KEY,
    order_id          UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    provider          VARCHAR(20) NOT NULL,
    session_id        VARCHAR(100) NOT NULL UNIQUE,
    amount_minor      BIGINT      NOT NULL,
    currency          VARCHAR(3)  NOT NULL,
    status            VARCHAR(20) NOT NULL CHECK (status IN ('CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED')),
    provider_token    VARCHAR(100),
    provider_order_id BIGINT,
    method_id         INT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments (order_id);

-- Every call to and from the payment provider, for reconciliation and webhook monitoring.
CREATE TABLE payment_events (
    id         BIGSERIAL PRIMARY KEY,
    payment_id UUID REFERENCES payments (id) ON DELETE CASCADE,
    type       VARCHAR(40) NOT NULL,
    success    BOOLEAN     NOT NULL,
    detail     VARCHAR(500),
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_events_created ON payment_events (created_at DESC);

-- Idempotent checkout: the same Idempotency-Key never creates a second order.
CREATE TABLE checkout_requests (
    idempotency_key VARCHAR(100) PRIMARY KEY,
    order_id        UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    response        JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
