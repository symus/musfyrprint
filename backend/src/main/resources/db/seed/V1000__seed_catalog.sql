-- Development / demo seed data. Loaded only when the "seed" location is enabled (dev & test profiles).
-- All product copy and template names are original placeholder content.

INSERT INTO colors (id, code, name, hex, sort_order) VALUES
  (gen_random_uuid(), 'white',        'White',         '#FFFFFF', 1),
  (gen_random_uuid(), 'black',        'Black',         '#1B1A1F', 2),
  (gen_random_uuid(), 'heather-grey', 'Heather Grey',  '#B8B8BD', 3),
  (gen_random_uuid(), 'navy',         'Navy',          '#1F2A4A', 4),
  (gen_random_uuid(), 'coral',        'Coral',         '#FF6B5B', 5),
  (gen_random_uuid(), 'sunflower',    'Sunflower',     '#FFC93C', 6),
  (gen_random_uuid(), 'mint',         'Mint',          '#9EE6CF', 7),
  (gen_random_uuid(), 'lavender',     'Lavender',      '#C9B8F5', 8),
  (gen_random_uuid(), 'forest',       'Forest Green',  '#2F5D46', 9),
  (gen_random_uuid(), 'baby-pink',    'Baby Pink',     '#F8C8D8', 10),
  (gen_random_uuid(), 'sky',          'Sky Blue',      '#A8D8F5', 11),
  (gen_random_uuid(), 'natural',      'Natural',       '#EFE6D2', 12),
  (gen_random_uuid(), 'clear',        'Transparent',   '#F4F6F8', 13);

INSERT INTO print_methods (id, code, name, description) VALUES
  (gen_random_uuid(), 'DTG',             'Direct-to-Garment', 'Water-based inks printed straight into cotton fibres. Best for detailed, multi-colour artwork on light and dark cotton.'),
  (gen_random_uuid(), 'DTF',             'Direct-to-Film',    'Artwork printed on film and heat-pressed. Vibrant on cotton, blends and polyester; slightly raised feel.'),
  (gen_random_uuid(), 'SCREEN',          'Screen Printing',   'Spot-colour printing for larger runs. Most economical from roughly 30 pieces with up to 4 colours.'),
  (gen_random_uuid(), 'HEAT_TRANSFER',   'Heat Transfer Vinyl','Cut vinyl names and numbers. Ideal for sports kits and simple one-colour text.'),
  (gen_random_uuid(), 'SUBLIMATION',     'Sublimation',       'Dye infused into light-coloured polyester. Not suitable for cotton or dark garments.'),
  (gen_random_uuid(), 'DIGITAL_STICKER', 'Digital Sticker Print', 'Full-colour digital print on vinyl or film with contour cutting.');

INSERT INTO categories (id, slug, name, description, product_family, accent_hex, sort_order) VALUES
  (gen_random_uuid(), 't-shirts',            'T-Shirts',               'Classic, fitted and oversized tees ready for your design.', 'APPAREL', '#FF6B5B', 1),
  (gen_random_uuid(), 'hoodies-sweatshirts', 'Hoodies & Sweatshirts',  'Cosy fleece hoodies and crewnecks for every season.',     'APPAREL', '#6C4CF5', 2),
  (gen_random_uuid(), 'baby',                'Baby',                   'Soft bodysuits and tees for the newest family members.',  'APPAREL', '#F8C8D8', 3),
  (gen_random_uuid(), 'kids-teens',          'Kids & Teens',           'Durable, playful fits for school, sport and weekends.',   'APPAREL', '#22B8A0', 4),
  (gen_random_uuid(), 'stickers',            'Stickers',               'Die-cut, kiss-cut, transparent and waterproof stickers.', 'STICKER', '#FFC93C', 5),
  (gen_random_uuid(), 'bags-merch',          'Bags & Merch',           'Totes and everyday merchandise for brands and gifts.',    'MERCH',   '#2F5D46', 6);

-- Helper used only during seeding (pg_temp is dropped at the end of the session).
CREATE FUNCTION pg_temp.seed_product(
    p_slug TEXT, p_category TEXT, p_name TEXT, p_short TEXT, p_desc TEXT, p_family TEXT, p_garment TEXT,
    p_age TEXT, p_gender TEXT, p_fit TEXT, p_material TEXT, p_price BIGINT, p_featured BOOLEAN,
    p_days_min INT, p_days_max INT, p_tags TEXT[], p_rating NUMERIC, p_rating_count INT, p_created_offset_days INT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO products (id, category_id, slug, name, short_description, description, product_family, garment_type,
                          age_group, gender, fit, material, base_price_minor, currency, production_days_min,
                          production_days_max, customizable, featured, status, tags, model_key, rating_avg,
                          rating_count, created_at, updated_at)
    VALUES (v_id, (SELECT id FROM categories WHERE slug = p_category), p_slug, p_name, p_short, p_desc, p_family,
            p_garment, p_age, p_gender, p_fit, p_material, p_price, 'PLN', p_days_min, p_days_max, TRUE, p_featured,
            'ACTIVE', p_tags, lower(p_garment), p_rating, p_rating_count,
            now() - make_interval(days => p_created_offset_days), now());
    RETURN v_id;
END $$;

CREATE FUNCTION pg_temp.seed_variants(p_slug TEXT, p_sku_prefix TEXT, p_colors TEXT[], p_sizes TEXT[], p_stock INT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_product UUID := (SELECT id FROM products WHERE slug = p_slug);
BEGIN
    INSERT INTO product_colors (product_id, color_id, sort_order)
    SELECT v_product, c.id, c.sort_order FROM colors c WHERE c.code = ANY (p_colors);

    INSERT INTO product_variants (id, product_id, sku, color_id, size_code, size_sort, stock_quantity)
    SELECT gen_random_uuid(), v_product,
           upper(p_sku_prefix || '-' || c.code || '-' || replace(s.size, '.', '_')),
           c.id, s.size, s.ord::INT, p_stock
    FROM colors c
    CROSS JOIN unnest(p_sizes) WITH ORDINALITY AS s(size, ord)
    WHERE c.code = ANY (p_colors);
END $$;

CREATE FUNCTION pg_temp.seed_print(p_slug TEXT, p_methods TEXT[], p_default TEXT, p_areas JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_product UUID := (SELECT id FROM products WHERE slug = p_slug);
BEGIN
    INSERT INTO product_print_methods (product_id, print_method_id, is_default)
    SELECT v_product, m.id, m.code = p_default FROM print_methods m WHERE m.code = ANY (p_methods);

    INSERT INTO print_areas (id, product_id, code, name, width_mm, height_mm, safe_margin_mm, min_dpi, price_delta_minor, sort_order)
    SELECT gen_random_uuid(), v_product, a->>'code', a->>'name', (a->>'w')::INT, (a->>'h')::INT,
           coalesce((a->>'safe')::INT, 5), coalesce((a->>'dpi')::INT, 150), coalesce((a->>'fee')::BIGINT, 0), ord::INT
    FROM jsonb_array_elements(p_areas) WITH ORDINALITY AS t(a, ord);
END $$;

CREATE FUNCTION pg_temp.seed_options(p_slug TEXT, p_code TEXT, p_name TEXT, p_sort INT, p_values JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_group UUID := gen_random_uuid();
BEGIN
    INSERT INTO product_option_groups (id, product_id, code, name, sort_order)
    VALUES (v_group, (SELECT id FROM products WHERE slug = p_slug), p_code, p_name, p_sort);

    INSERT INTO product_option_values (id, group_id, code, label, price_delta_minor, sort_order)
    SELECT gen_random_uuid(), v_group, v->>'code', v->>'label', coalesce((v->>'delta')::BIGINT, 0), ord::INT
    FROM jsonb_array_elements(p_values) WITH ORDINALITY AS t(v, ord);
END $$;

-- ---------------------------------------------------------------------------
-- Apparel
-- ---------------------------------------------------------------------------
SELECT pg_temp.seed_product('classic-unisex-tee', 't-shirts', 'Classic Unisex Tee',
  'Our everyday regular-fit tee in soft ring-spun cotton.',
  'A dependable crew-neck tee with a regular fit, taped shoulders and a tear-away label. The smooth surface takes detailed prints beautifully.',
  'APPAREL', 'TSHIRT', 'ADULT', 'UNISEX', 'REGULAR', '100% combed ring-spun cotton, 180 g/m²', 5900, TRUE, 2, 4,
  ARRAY['bestseller','cotton','everyday'], 4.80, 214, 40);
SELECT pg_temp.seed_product('womens-fitted-tee', 't-shirts', 'Women''s Fitted Tee',
  'A tailored, slightly longer tee with a flattering shape.',
  'Cut closer to the body with a softly scooped crew neck and side seams. Lightweight and breathable for warm days.',
  'APPAREL', 'TSHIRT', 'ADULT', 'WOMEN', 'FITTED', '100% organic cotton, 160 g/m²', 6400, FALSE, 2, 4,
  ARRAY['organic','fitted'], 4.70, 98, 35);
SELECT pg_temp.seed_product('mens-oversized-tee', 't-shirts', 'Oversized Heavyweight Tee',
  'Dropped shoulders, boxy fit and a heavyweight hand-feel.',
  'Streetwear-inspired heavyweight tee with a ribbed collar and dropped shoulders. Size down for a closer fit.',
  'APPAREL', 'TSHIRT', 'ADULT', 'MEN', 'OVERSIZED', '100% cotton, 240 g/m²', 7900, TRUE, 3, 5,
  ARRAY['streetwear','heavyweight','new'], 4.90, 61, 5);
SELECT pg_temp.seed_product('long-sleeve-tee', 't-shirts', 'Long Sleeve Tee',
  'All the comfort of our classic tee, with long sleeves.',
  'Regular-fit long sleeve tee with ribbed cuffs. Print on the chest, back or down the sleeve.',
  'APPAREL', 'LONGSLEEVE', 'ADULT', 'UNISEX', 'REGULAR', '100% combed cotton, 190 g/m²', 7900, FALSE, 2, 5,
  ARRAY['cotton','layering'], 4.60, 44, 28);
SELECT pg_temp.seed_product('organic-tank-top', 't-shirts', 'Organic Tank Top',
  'A breezy relaxed tank for summer, gym and festivals.',
  'Relaxed-fit tank with deep armholes, made from certified organic cotton.',
  'APPAREL', 'TANK', 'ADULT', 'UNISEX', 'RELAXED', '100% organic cotton, 150 g/m²', 4900, FALSE, 2, 4,
  ARRAY['organic','summer','new'], 4.50, 17, 8);
SELECT pg_temp.seed_product('pullover-hoodie', 'hoodies-sweatshirts', 'Pullover Hoodie',
  'Brushed-fleece hoodie with kangaroo pocket and double-lined hood.',
  'A warm mid-weight hoodie with a brushed interior, flat drawcords and ribbed cuffs. Great for team and event merch.',
  'APPAREL', 'HOODIE', 'ADULT', 'UNISEX', 'REGULAR', '80% cotton / 20% recycled polyester, 300 g/m²', 14900, TRUE, 3, 6,
  ARRAY['bestseller','fleece','team'], 4.85, 132, 50);
SELECT pg_temp.seed_product('crewneck-sweatshirt', 'hoodies-sweatshirts', 'Crewneck Sweatshirt',
  'A clean, relaxed crewneck that layers over anything.',
  'Soft brushed fleece with a ribbed neckline, cuffs and hem.',
  'APPAREL', 'SWEATSHIRT', 'ADULT', 'UNISEX', 'RELAXED', '80% cotton / 20% polyester, 280 g/m²', 12900, FALSE, 3, 6,
  ARRAY['fleece','cosy'], 4.70, 58, 22);
SELECT pg_temp.seed_product('baby-bodysuit', 'baby', 'Baby Bodysuit',
  'Short-sleeve bodysuit with envelope neck and snap closure.',
  'Super-soft bodysuit with an envelope neckline for easy dressing and nickel-free snaps. Printed with water-based inks.',
  'APPAREL', 'BODYSUIT', 'BABY', 'UNISEX', 'REGULAR', '100% combed organic cotton, 200 g/m²', 4900, TRUE, 2, 4,
  ARRAY['baby','gift','organic'], 4.95, 187, 30);
SELECT pg_temp.seed_product('baby-tee', 'baby', 'Baby & Toddler Tee',
  'A tiny classic tee for babies and toddlers.',
  'Lap-shoulder neckline that stretches over little heads. Soft, durable and washable.',
  'APPAREL', 'TSHIRT', 'TODDLER', 'UNISEX', 'REGULAR', '100% organic cotton, 180 g/m²', 4500, FALSE, 2, 4,
  ARRAY['baby','toddler','gift'], 4.80, 73, 18);
SELECT pg_temp.seed_product('kids-tee', 'kids-teens', 'Kids'' Tee',
  'Tough, comfy tee for playground adventures.',
  'Reinforced collar, double-stitched hems and a regular fit with room to move.',
  'APPAREL', 'TSHIRT', 'KIDS', 'UNISEX', 'REGULAR', '100% cotton, 170 g/m²', 4900, TRUE, 2, 4,
  ARRAY['kids','school','birthday'], 4.75, 121, 26);
SELECT pg_temp.seed_product('teen-tee', 'kids-teens', 'Teen Tee',
  'Teen sizing with an adult-style cut.',
  'Sized for 12–16 years with a slightly longer body and modern neckline.',
  'APPAREL', 'TSHIRT', 'TEEN', 'UNISEX', 'REGULAR', '100% cotton, 180 g/m²', 5500, FALSE, 2, 4,
  ARRAY['teen','school','new'], 4.60, 26, 3);
SELECT pg_temp.seed_product('kids-hoodie', 'kids-teens', 'Kids'' Hoodie',
  'A cosy hoodie with safety-first, cord-free hood.',
  'Cord-free hood, kangaroo pocket and brushed fleece lining. Perfect for school clubs and teams.',
  'APPAREL', 'HOODIE', 'KIDS', 'UNISEX', 'REGULAR', '80% cotton / 20% polyester, 280 g/m²', 9900, FALSE, 3, 6,
  ARRAY['kids','school','team'], 4.70, 39, 14);
SELECT pg_temp.seed_product('everyday-tote', 'bags-merch', 'Everyday Cotton Tote',
  'A sturdy canvas tote with long handles.',
  'Heavy canvas tote with reinforced handles. A favourite for events, shops and conferences.',
  'MERCH', 'TOTE', 'NA', 'NA', 'NA', '100% cotton canvas, 280 g/m²', 3900, FALSE, 2, 5,
  ARRAY['eco','business','event'], 4.65, 52, 33);

-- ---------------------------------------------------------------------------
-- Stickers (size_code = finished sticker size; quantity pricing arrives with the pricing service)
-- ---------------------------------------------------------------------------
SELECT pg_temp.seed_product('die-cut-vinyl-sticker', 'stickers', 'Die-Cut Vinyl Sticker',
  'Cut precisely to the shape of your design. Pack of 10.',
  'Durable vinyl with a laminate that protects against scratches and sunlight. Contour-cut to your artwork outline.',
  'STICKER', 'STICKER_DIE_CUT', 'NA', 'NA', 'NA', 'Vinyl with UV laminate', 2900, TRUE, 1, 3,
  ARRAY['bestseller','vinyl','waterproof'], 4.90, 305, 45);
SELECT pg_temp.seed_product('kiss-cut-sticker-sheet', 'stickers', 'Kiss-Cut Sticker Sheet',
  'Multiple stickers on one easy-peel A5 sheet.',
  'Arrange several designs on one A5 sheet. The backing stays intact so stickers peel easily.',
  'STICKER', 'STICKER_SHEET', 'NA', 'NA', 'NA', 'Matte or gloss vinyl', 2400, FALSE, 1, 3,
  ARRAY['sheet','kids','planner'], 4.70, 88, 21);
SELECT pg_temp.seed_product('transparent-sticker', 'stickers', 'Transparent Sticker',
  'Clear film stickers – only your artwork shows. Pack of 10.',
  'Printed on crystal-clear film. White ink underlay keeps colours vibrant on glass and laptops.',
  'STICKER', 'STICKER_DIE_CUT', 'NA', 'NA', 'NA', 'Clear PET film', 3400, FALSE, 2, 4,
  ARRAY['transparent','laptop','new'], 4.60, 34, 6);
SELECT pg_temp.seed_product('kids-name-sticker-pack', 'stickers', 'Kids'' Name Label Pack',
  '60 waterproof name labels for school supplies.',
  'Dishwasher-safe name labels for bottles, lunchboxes and books. Personalise with a name and a fun icon.',
  'STICKER', 'STICKER_SHEET', 'KIDS', 'NA', 'NA', 'Waterproof vinyl', 3900, FALSE, 2, 4,
  ARRAY['kids','school','waterproof','name'], 4.85, 142, 19);
SELECT pg_temp.seed_product('custom-logo-labels', 'stickers', 'Custom Logo Labels (Roll of 250)',
  'Branded labels for packaging, jars and parcels.',
  'Round or rectangular product labels on a roll, ideal for small businesses and packaging.',
  'STICKER', 'STICKER_LABEL', 'NA', 'NA', 'NA', 'Paper or vinyl, permanent adhesive', 14900, FALSE, 3, 6,
  ARRAY['business','packaging','bulk'], 4.75, 46, 37);

-- Variants -----------------------------------------------------------------
SELECT pg_temp.seed_variants('classic-unisex-tee', 'CUT', ARRAY['white','black','heather-grey','navy','coral','sunflower','mint','forest'], ARRAY['XS','S','M','L','XL','2XL','3XL'], 60);
SELECT pg_temp.seed_variants('womens-fitted-tee', 'WFT', ARRAY['white','black','lavender','coral','mint'], ARRAY['XS','S','M','L','XL','2XL'], 40);
SELECT pg_temp.seed_variants('mens-oversized-tee', 'MOT', ARRAY['white','black','heather-grey','forest','natural'], ARRAY['S','M','L','XL','2XL'], 35);
SELECT pg_temp.seed_variants('long-sleeve-tee', 'LST', ARRAY['white','black','navy'], ARRAY['S','M','L','XL','2XL'], 30);
SELECT pg_temp.seed_variants('organic-tank-top', 'OTT', ARRAY['white','black','sunflower'], ARRAY['XS','S','M','L','XL'], 25);
SELECT pg_temp.seed_variants('pullover-hoodie', 'PHD', ARRAY['black','heather-grey','navy','lavender','forest'], ARRAY['XS','S','M','L','XL','2XL','3XL'], 30);
SELECT pg_temp.seed_variants('crewneck-sweatshirt', 'CRS', ARRAY['heather-grey','navy','natural'], ARRAY['S','M','L','XL','2XL'], 20);
SELECT pg_temp.seed_variants('baby-bodysuit', 'BBS', ARRAY['white','baby-pink','sky','sunflower'], ARRAY['0-3M','3-6M','6-12M','12-18M','18-24M'], 40);
SELECT pg_temp.seed_variants('baby-tee', 'BTE', ARRAY['white','baby-pink','sky','mint'], ARRAY['6-12M','12-18M','18-24M','2Y','3Y','4Y'], 30);
SELECT pg_temp.seed_variants('kids-tee', 'KTE', ARRAY['white','black','coral','sky','sunflower','mint'], ARRAY['3-4Y','5-6Y','7-8Y','9-10Y','11-12Y'], 40);
SELECT pg_temp.seed_variants('teen-tee', 'TTE', ARRAY['white','black','heather-grey','lavender'], ARRAY['12Y','13Y','14Y','15-16Y'], 25);
SELECT pg_temp.seed_variants('kids-hoodie', 'KHD', ARRAY['navy','heather-grey','coral'], ARRAY['3-4Y','5-6Y','7-8Y','9-10Y','11-12Y'], 20);
SELECT pg_temp.seed_variants('everyday-tote', 'TOT', ARRAY['natural','black'], ARRAY['ONE_SIZE'], 80);
SELECT pg_temp.seed_variants('die-cut-vinyl-sticker', 'DCS', ARRAY['white'], ARRAY['5x5CM','7.5x7.5CM','10x10CM'], 1000);
SELECT pg_temp.seed_variants('kiss-cut-sticker-sheet', 'KCS', ARRAY['white'], ARRAY['A5','A4'], 500);
SELECT pg_temp.seed_variants('transparent-sticker', 'TRS', ARRAY['clear'], ARRAY['5x5CM','7.5x7.5CM','10x10CM'], 500);
SELECT pg_temp.seed_variants('kids-name-sticker-pack', 'KNS', ARRAY['white'], ARRAY['ONE_SIZE'], 300);
SELECT pg_temp.seed_variants('custom-logo-labels', 'CLL', ARRAY['white','clear'], ARRAY['3x3CM','5x5CM','7.5x5CM'], 200);

-- Size-based price overrides (larger sticker sizes / plus sizes cost more).
UPDATE product_variants v SET price_minor = p.base_price_minor + 600
FROM products p WHERE v.product_id = p.id AND v.size_code IN ('2XL','3XL');
UPDATE product_variants v SET price_minor = p.base_price_minor + 1000
FROM products p
WHERE v.product_id = p.id AND p.product_family = 'STICKER'
  AND (v.size_code IN ('7.5x7.5CM', 'A4') OR (p.slug = 'custom-logo-labels' AND v.size_code = '5x5CM'));
UPDATE product_variants v SET price_minor = p.base_price_minor + 2000
FROM products p
WHERE v.product_id = p.id AND p.product_family = 'STICKER' AND v.size_code IN ('10x10CM', '7.5x5CM');

-- Print configuration -----------------------------------------------------------
SELECT pg_temp.seed_print(slug, ARRAY['DTG','DTF','SCREEN','HEAT_TRANSFER'], 'DTG',
  '[{"code":"FRONT","name":"Front","w":300,"h":400},
    {"code":"BACK","name":"Back","w":300,"h":400,"fee":1500},
    {"code":"LEFT_CHEST","name":"Left chest","w":100,"h":100,"fee":800},
    {"code":"RIGHT_CHEST","name":"Right chest","w":100,"h":100,"fee":800}]')
FROM products WHERE slug IN ('classic-unisex-tee','womens-fitted-tee','mens-oversized-tee','organic-tank-top','teen-tee');

SELECT pg_temp.seed_print('long-sleeve-tee', ARRAY['DTG','DTF'], 'DTG',
  '[{"code":"FRONT","name":"Front","w":300,"h":400},
    {"code":"BACK","name":"Back","w":300,"h":400,"fee":1500},
    {"code":"LEFT_SLEEVE","name":"Left sleeve","w":80,"h":400,"fee":1200},
    {"code":"RIGHT_SLEEVE","name":"Right sleeve","w":80,"h":400,"fee":1200}]');

SELECT pg_temp.seed_print(slug, ARRAY['DTF','DTG','SCREEN'], 'DTF',
  '[{"code":"FRONT","name":"Front","w":280,"h":300},
    {"code":"BACK","name":"Back","w":320,"h":400,"fee":1800},
    {"code":"LEFT_CHEST","name":"Left chest","w":100,"h":100,"fee":800},
    {"code":"LEFT_SLEEVE","name":"Left sleeve","w":80,"h":350,"fee":1200}]')
FROM products WHERE slug IN ('pullover-hoodie','crewneck-sweatshirt');

SELECT pg_temp.seed_print(slug, ARRAY['DTG','DTF'], 'DTG',
  '[{"code":"FRONT","name":"Front","w":160,"h":180},
    {"code":"BACK","name":"Back","w":160,"h":180,"fee":1000}]')
FROM products WHERE slug IN ('baby-bodysuit','baby-tee');

SELECT pg_temp.seed_print(slug, ARRAY['DTG','DTF','HEAT_TRANSFER'], 'DTG',
  '[{"code":"FRONT","name":"Front","w":230,"h":300},
    {"code":"BACK","name":"Back","w":230,"h":300,"fee":1200}]')
FROM products WHERE slug IN ('kids-tee','kids-hoodie');

SELECT pg_temp.seed_print('everyday-tote', ARRAY['DTF','SCREEN'], 'DTF',
  '[{"code":"FRONT","name":"Front","w":280,"h":320},
    {"code":"BACK","name":"Back","w":280,"h":320,"fee":1200}]');

SELECT pg_temp.seed_print(slug, ARRAY['DIGITAL_STICKER'], 'DIGITAL_STICKER',
  '[{"code":"FULL","name":"Full sticker","w":100,"h":100,"safe":2,"dpi":300}]')
FROM products WHERE product_family = 'STICKER' AND slug NOT IN ('kiss-cut-sticker-sheet');

SELECT pg_temp.seed_print('kiss-cut-sticker-sheet', ARRAY['DIGITAL_STICKER'], 'DIGITAL_STICKER',
  '[{"code":"SHEET","name":"Sticker sheet","w":148,"h":210,"safe":4,"dpi":300}]');

-- Sticker option groups -----------------------------------------------------------
SELECT pg_temp.seed_options(slug, 'finish', 'Finish', 1,
  '[{"code":"gloss","label":"Gloss"},{"code":"matte","label":"Matte"},{"code":"holographic","label":"Holographic","delta":800}]')
FROM products WHERE slug IN ('die-cut-vinyl-sticker','kiss-cut-sticker-sheet');
SELECT pg_temp.seed_options('die-cut-vinyl-sticker', 'material', 'Material', 2,
  '[{"code":"vinyl","label":"Standard vinyl"},{"code":"waterproof","label":"Waterproof vinyl","delta":400}]');
SELECT pg_temp.seed_options('custom-logo-labels', 'material', 'Material', 1,
  '[{"code":"paper","label":"Paper (indoor)"},{"code":"vinyl","label":"Vinyl (water resistant)","delta":3000}]');
SELECT pg_temp.seed_options('custom-logo-labels', 'shape', 'Shape', 2,
  '[{"code":"circle","label":"Circle"},{"code":"rectangle","label":"Rounded rectangle"}]');

-- Collections -------------------------------------------------------------------
INSERT INTO collections (id, slug, name, description, kind, accent_hex, sort_order) VALUES
  (gen_random_uuid(), 'birthday-gifts',   'Birthday Gifts',          'Personalised tees, hoodies and sticker packs that make birthdays unforgettable.', 'GIFT',     '#FF6B5B', 1),
  (gen_random_uuid(), 'family-matching',  'Family Matching Outfits', 'Coordinated designs for parents, kids and babies – from holidays to reunions.',    'FAMILY',   '#6C4CF5', 2),
  (gen_random_uuid(), 'baby-shower',      'Baby Shower & Newborn',   'Gentle organic pieces for announcements and first photos.',                        'GIFT',     '#F8C8D8', 3),
  (gen_random_uuid(), 'business-merch',   'Business Merchandise',    'Branded apparel, totes and labels for teams, events and packaging.',               'BUSINESS', '#2F5D46', 4),
  (gen_random_uuid(), 'school-and-teams', 'School, Clubs & Teams',   'Kit out your class, club or squad with names and numbers.',                       'CURATED',  '#22B8A0', 5);

INSERT INTO collection_products (collection_id, product_id, sort_order)
SELECT c.id, p.id, row_number() OVER (PARTITION BY c.id ORDER BY p.featured DESC, p.name)
FROM collections c JOIN products p ON
  (c.slug = 'birthday-gifts'   AND p.slug IN ('classic-unisex-tee','kids-tee','baby-bodysuit','die-cut-vinyl-sticker','pullover-hoodie')) OR
  (c.slug = 'family-matching'  AND p.slug IN ('classic-unisex-tee','womens-fitted-tee','kids-tee','baby-bodysuit','baby-tee')) OR
  (c.slug = 'baby-shower'      AND p.slug IN ('baby-bodysuit','baby-tee')) OR
  (c.slug = 'business-merch'   AND p.slug IN ('classic-unisex-tee','pullover-hoodie','everyday-tote','custom-logo-labels','die-cut-vinyl-sticker')) OR
  (c.slug = 'school-and-teams' AND p.slug IN ('kids-tee','teen-tee','kids-hoodie','kids-name-sticker-pack','pullover-hoodie'));

-- Promotions (display only; redemption is validated server-side by the pricing service in Phase 3)
INSERT INTO promotions (id, code, title, description, discount_type, discount_value, min_order_minor, currency, public_banner, starts_at, ends_at) VALUES
  (gen_random_uuid(), 'WELCOME10', '10% off your first design', 'New here? Use code WELCOME10 on your first order.', 'PERCENT', 10, 0, 'PLN', TRUE, now() - interval '1 day', now() + interval '365 days'),
  (gen_random_uuid(), 'FREESHIP199', 'Free shipping over 199 zł', 'Free standard delivery in Poland on orders over 199 zł.', 'FREE_SHIPPING', 0, 19900, 'PLN', TRUE, now() - interval '1 day', NULL);
