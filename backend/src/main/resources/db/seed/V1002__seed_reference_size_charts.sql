-- Reference size charts for the demo catalogue. Values follow common industry ranges and are NOT supplier data:
-- every chart is marked source = 'REFERENCE' until real garment measurements replace it.

CREATE FUNCTION pg_temp.chart(p_slugs TEXT[], p_note TEXT, p_note_pl TEXT, p_rows JSONB) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_product UUID; v_chart UUID;
BEGIN
    FOR v_product IN SELECT id FROM products WHERE slug = ANY (p_slugs) LOOP
        v_chart := gen_random_uuid();
        INSERT INTO size_charts (id, product_id, source, fit_note, i18n)
        VALUES (v_chart, v_product, 'REFERENCE', p_note,
                CASE WHEN p_note_pl IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('pl', jsonb_build_object('fit_note', p_note_pl)) END);
        INSERT INTO size_chart_rows (id, chart_id, size_code, sort_order, age_min_months, age_max_months, height_min, height_max,
                                     chest_min, chest_max, waist_min, waist_max, garment_width, garment_length, labels)
        SELECT gen_random_uuid(), v_chart, r->>'size', ord::INT, (r->>'ageMin')::INT, (r->>'ageMax')::INT,
               (r->'h'->>0)::NUMERIC, (r->'h'->>1)::NUMERIC, (r->'c'->>0)::NUMERIC, (r->'c'->>1)::NUMERIC,
               (r->'w'->>0)::NUMERIC, (r->'w'->>1)::NUMERIC, (r->>'gw')::NUMERIC, (r->>'gl')::NUMERIC, r->'labels'
        FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS t(r, ord)
        -- only sizes the product is actually sold in
        WHERE EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = v_product AND v.size_code = r->>'size');
    END LOOP;
END $$;

-- Adult unisex, regular fit
SELECT pg_temp.chart(ARRAY['classic-unisex-tee','long-sleeve-tee','organic-tank-top'], 'Regular fit. Between sizes? Choose the larger one for a relaxed look.', 'Krój regularny. Jesteś pomiędzy rozmiarami? Wybierz większy dla luźniejszego efektu.', '[
 {"size":"XS","h":[158,166],"c":[82,87],"w":[68,73],"gw":46,"gl":67,"labels":{"EU":"44","UK":"34","US":"XS","CN":"160/84A","IN":"36"}},
 {"size":"S","h":[164,172],"c":[88,93],"w":[74,79],"gw":49,"gl":70,"labels":{"EU":"46","UK":"36","US":"S","CN":"165/88A","IN":"38"}},
 {"size":"M","h":[170,178],"c":[94,101],"w":[80,87],"gw":52,"gl":72,"labels":{"EU":"48–50","UK":"38–40","US":"M","CN":"170/92A","IN":"40"}},
 {"size":"L","h":[176,184],"c":[102,109],"w":[88,95],"gw":55,"gl":74,"labels":{"EU":"52","UK":"42","US":"L","CN":"175/96A","IN":"42"}},
 {"size":"XL","h":[180,188],"c":[110,117],"w":[96,103],"gw":58,"gl":76,"labels":{"EU":"54","UK":"44","US":"XL","CN":"180/100A","IN":"44"}},
 {"size":"2XL","h":[184,192],"c":[118,125],"w":[104,111],"gw":61,"gl":78,"labels":{"EU":"56","UK":"46","US":"XXL","CN":"185/104A","IN":"46"}},
 {"size":"3XL","h":[186,196],"c":[126,133],"w":[112,119],"gw":64,"gl":80,"labels":{"EU":"58","UK":"48","US":"3XL","CN":"190/108A","IN":"48"}}]');

-- Hoodies & sweatshirts: same body ranges, roomier garment
SELECT pg_temp.chart(ARRAY['pullover-hoodie','crewneck-sweatshirt'], 'Regular fit with room for layering underneath.', 'Krój regularny z miejscem na warstwę pod spodem.', '[
 {"size":"XS","h":[158,166],"c":[82,87],"gw":50,"gl":66,"labels":{"EU":"44","UK":"34","US":"XS","CN":"160/84A","IN":"36"}},
 {"size":"S","h":[164,172],"c":[88,93],"gw":53,"gl":68,"labels":{"EU":"46","UK":"36","US":"S","CN":"165/88A","IN":"38"}},
 {"size":"M","h":[170,178],"c":[94,101],"gw":56,"gl":70,"labels":{"EU":"48–50","UK":"38–40","US":"M","CN":"170/92A","IN":"40"}},
 {"size":"L","h":[176,184],"c":[102,109],"gw":59,"gl":72,"labels":{"EU":"52","UK":"42","US":"L","CN":"175/96A","IN":"42"}},
 {"size":"XL","h":[180,188],"c":[110,117],"gw":62,"gl":74,"labels":{"EU":"54","UK":"44","US":"XL","CN":"180/100A","IN":"44"}},
 {"size":"2XL","h":[184,192],"c":[118,125],"gw":65,"gl":76,"labels":{"EU":"56","UK":"46","US":"XXL","CN":"185/104A","IN":"46"}},
 {"size":"3XL","h":[186,196],"c":[126,133],"gw":68,"gl":78,"labels":{"EU":"58","UK":"48","US":"3XL","CN":"190/108A","IN":"48"}}]');

-- Oversized
SELECT pg_temp.chart(ARRAY['mens-oversized-tee'], 'Oversized, boxy fit. Size down for a closer fit.', 'Krój oversize. Dla bliższego dopasowania wybierz rozmiar mniejszy.', '[
 {"size":"S","h":[164,172],"c":[88,93],"gw":56,"gl":72,"labels":{"EU":"46","UK":"36","US":"S","CN":"165/88A","IN":"38"}},
 {"size":"M","h":[170,178],"c":[94,101],"gw":59,"gl":74,"labels":{"EU":"48–50","UK":"38–40","US":"M","CN":"170/92A","IN":"40"}},
 {"size":"L","h":[176,184],"c":[102,109],"gw":62,"gl":76,"labels":{"EU":"52","UK":"42","US":"L","CN":"175/96A","IN":"42"}},
 {"size":"XL","h":[180,188],"c":[110,117],"gw":65,"gl":78,"labels":{"EU":"54","UK":"44","US":"XL","CN":"180/100A","IN":"44"}},
 {"size":"2XL","h":[184,192],"c":[118,125],"gw":68,"gl":80,"labels":{"EU":"56","UK":"46","US":"XXL","CN":"185/104A","IN":"46"}}]');

-- Women, fitted
SELECT pg_temp.chart(ARRAY['womens-fitted-tee'], 'Fitted cut that follows the body. Size up for a looser fit.', 'Dopasowany krój. Dla luźniejszego efektu wybierz rozmiar większy.', '[
 {"size":"XS","h":[155,163],"c":[78,82],"w":[60,64],"gw":42,"gl":60,"labels":{"EU":"32–34","UK":"6","US":"2","CN":"155/76A","IN":"XS"}},
 {"size":"S","h":[160,168],"c":[83,87],"w":[65,69],"gw":45,"gl":62,"labels":{"EU":"36","UK":"8–10","US":"4–6","CN":"160/80A","IN":"S"}},
 {"size":"M","h":[164,172],"c":[88,93],"w":[70,75],"gw":48,"gl":64,"labels":{"EU":"38","UK":"12","US":"8","CN":"165/84A","IN":"M"}},
 {"size":"L","h":[166,174],"c":[94,99],"w":[76,81],"gw":51,"gl":66,"labels":{"EU":"40–42","UK":"14","US":"10–12","CN":"170/88A","IN":"L"}},
 {"size":"XL","h":[168,176],"c":[100,106],"w":[82,88],"gw":54,"gl":68,"labels":{"EU":"44","UK":"16–18","US":"14","CN":"175/92A","IN":"XL"}},
 {"size":"2XL","h":[168,178],"c":[107,113],"w":[89,95],"gw":57,"gl":70,"labels":{"EU":"46","UK":"20","US":"16","CN":"180/96A","IN":"XXL"}}]');

-- Baby bodysuit
SELECT pg_temp.chart(ARRAY['baby-bodysuit'], 'Age is a guide only – choose by your baby''s height.', 'Wiek jest orientacyjny – wybieraj według wzrostu dziecka.', '[
 {"size":"0-3M","ageMin":0,"ageMax":3,"h":[56,62],"c":[38,42],"gw":21,"gl":34,"labels":{"EU":"62","UK":"0–3 m","US":"3M","CN":"59","IN":"0–3 M"}},
 {"size":"3-6M","ageMin":3,"ageMax":6,"h":[62,68],"c":[42,44],"gw":22,"gl":37,"labels":{"EU":"68","UK":"3–6 m","US":"6M","CN":"66","IN":"3–6 M"}},
 {"size":"6-12M","ageMin":6,"ageMax":12,"h":[68,80],"c":[44,47],"gw":24,"gl":40,"labels":{"EU":"74–80","UK":"6–12 m","US":"12M","CN":"73","IN":"6–12 M"}},
 {"size":"12-18M","ageMin":12,"ageMax":18,"h":[80,86],"c":[47,49],"gw":25,"gl":43,"labels":{"EU":"86","UK":"12–18 m","US":"18M","CN":"80","IN":"12–18 M"}},
 {"size":"18-24M","ageMin":18,"ageMax":24,"h":[86,92],"c":[49,51],"gw":26,"gl":46,"labels":{"EU":"92","UK":"18–24 m","US":"24M","CN":"90","IN":"18–24 M"}}]');

-- Baby & toddler tee
SELECT pg_temp.chart(ARRAY['baby-tee'], 'Age is a guide only – choose by your child''s height.', 'Wiek jest orientacyjny – wybieraj według wzrostu dziecka.', '[
 {"size":"6-12M","ageMin":6,"ageMax":12,"h":[68,80],"c":[44,47],"gw":25,"gl":30,"labels":{"EU":"74–80","UK":"6–12 m","US":"12M","CN":"73","IN":"6–12 M"}},
 {"size":"12-18M","ageMin":12,"ageMax":18,"h":[80,86],"c":[47,49],"gw":26,"gl":32,"labels":{"EU":"86","UK":"12–18 m","US":"18M","CN":"80","IN":"12–18 M"}},
 {"size":"18-24M","ageMin":18,"ageMax":24,"h":[86,92],"c":[49,51],"gw":27,"gl":34,"labels":{"EU":"92","UK":"18–24 m","US":"24M","CN":"90","IN":"18–24 M"}},
 {"size":"2Y","ageMin":24,"ageMax":36,"h":[92,98],"c":[51,53],"gw":28,"gl":36,"labels":{"EU":"98","UK":"2 yrs","US":"2T","CN":"90","IN":"2 Y"}},
 {"size":"3Y","ageMin":36,"ageMax":48,"h":[98,104],"c":[53,55],"gw":29,"gl":38,"labels":{"EU":"104","UK":"3 yrs","US":"3T","CN":"100","IN":"3 Y"}},
 {"size":"4Y","ageMin":48,"ageMax":60,"h":[104,110],"c":[55,57],"gw":30,"gl":40,"labels":{"EU":"110","UK":"4 yrs","US":"4T","CN":"110","IN":"4 Y"}}]');

-- Kids
SELECT pg_temp.chart(ARRAY['kids-tee','kids-hoodie'], 'Age is a guide only – choose by your child''s height and chest.', 'Wiek jest orientacyjny – wybieraj według wzrostu i obwodu klatki piersiowej.', '[
 {"size":"3-4Y","ageMin":36,"ageMax":60,"h":[98,104],"c":[52,56],"gw":31,"gl":42,"labels":{"EU":"104","UK":"3–4 yrs","US":"4","CN":"100","IN":"3–4 Y"}},
 {"size":"5-6Y","ageMin":60,"ageMax":84,"h":[110,116],"c":[56,60],"gw":34,"gl":46,"labels":{"EU":"116","UK":"5–6 yrs","US":"6","CN":"110","IN":"5–6 Y"}},
 {"size":"7-8Y","ageMin":84,"ageMax":108,"h":[122,128],"c":[60,64],"gw":37,"gl":50,"labels":{"EU":"128","UK":"7–8 yrs","US":"8","CN":"120","IN":"7–8 Y"}},
 {"size":"9-10Y","ageMin":108,"ageMax":132,"h":[134,140],"c":[66,70],"gw":40,"gl":54,"labels":{"EU":"140","UK":"9–10 yrs","US":"10","CN":"130","IN":"9–10 Y"}},
 {"size":"11-12Y","ageMin":132,"ageMax":156,"h":[146,152],"c":[72,76],"gw":43,"gl":58,"labels":{"EU":"152","UK":"11–12 yrs","US":"12","CN":"140","IN":"11–12 Y"}}]');

-- Teens
SELECT pg_temp.chart(ARRAY['teen-tee'], 'Teen sizes with an adult-style cut.', 'Rozmiary młodzieżowe w kroju dla dorosłych.', '[
 {"size":"12Y","ageMin":144,"ageMax":156,"h":[146,152],"c":[72,76],"gw":44,"gl":60,"labels":{"EU":"152","UK":"12 yrs","US":"14","CN":"150","IN":"12 Y"}},
 {"size":"13Y","ageMin":156,"ageMax":168,"h":[152,158],"c":[76,80],"gw":46,"gl":62,"labels":{"EU":"158","UK":"13 yrs","US":"16","CN":"155","IN":"13 Y"}},
 {"size":"14Y","ageMin":168,"ageMax":180,"h":[158,164],"c":[80,84],"gw":48,"gl":64,"labels":{"EU":"164","UK":"14 yrs","US":"18","CN":"160","IN":"14 Y"}},
 {"size":"15-16Y","ageMin":180,"ageMax":204,"h":[164,170],"c":[84,88],"gw":50,"gl":66,"labels":{"EU":"170","UK":"15–16 yrs","US":"20","CN":"165","IN":"15–16 Y"}}]');
