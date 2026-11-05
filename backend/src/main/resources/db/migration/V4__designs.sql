-- Design studio: uploaded artwork, saved designs and the template library.

CREATE TABLE artworks (
    id                  UUID PRIMARY KEY,
    original_filename   VARCHAR(200) NOT NULL,
    mime_type           VARCHAR(40)  NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/svg+xml')),
    width_px            INT,
    height_px           INT,
    size_bytes          INT          NOT NULL CHECK (size_bytes > 0),
    sha256              VARCHAR(64)  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'QUARANTINED', 'REMOVED')),
    scan_status         VARCHAR(20)  NOT NULL DEFAULT 'NOT_SCANNED' CHECK (scan_status IN ('NOT_SCANNED', 'CLEAN', 'INFECTED')),
    rights_confirmed_at TIMESTAMPTZ  NOT NULL,
    uploader_ip         VARCHAR(64),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_artworks_sha256 ON artworks (sha256);

-- Binary content lives apart from metadata so listing artworks never loads files. Replaceable by object storage.
CREATE TABLE artwork_blobs (
    artwork_id UUID  PRIMARY KEY REFERENCES artworks (id) ON DELETE CASCADE,
    content    BYTEA NOT NULL
);

CREATE TABLE designs (
    id              UUID PRIMARY KEY,
    edit_token_hash VARCHAR(64)  NOT NULL,
    product_id      UUID         NOT NULL REFERENCES products (id),
    color_code      VARCHAR(40),
    size_code       VARCHAR(30),
    name            VARCHAR(120),
    document        JSONB        NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'ARCHIVED')),
    version         BIGINT       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_designs_product ON designs (product_id);

CREATE TABLE design_templates (
    id         UUID PRIMARY KEY,
    slug       VARCHAR(80)  NOT NULL UNIQUE,
    category   VARCHAR(30)  NOT NULL CHECK (category IN ('BIRTHDAY', 'BABY', 'FAMILY', 'SCHOOL', 'SPORTS', 'FUNNY',
                                                         'MINIMAL', 'FESTIVE', 'PETS', 'COUPLES', 'CORPORATE',
                                                         'MONOGRAM', 'SEASONAL')),
    name       VARCHAR(120) NOT NULL,
    family     VARCHAR(20)  NOT NULL DEFAULT 'ANY' CHECK (family IN ('APPAREL', 'STICKER', 'ANY')),
    -- Resolution-independent layout: positions and sizes are fractions of the print area (see TemplateDocument).
    document   JSONB        NOT NULL,
    i18n       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status     VARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'RETIRED')),
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_design_templates_status ON design_templates (status, category, sort_order);
