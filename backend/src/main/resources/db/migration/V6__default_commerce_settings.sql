-- Default commerce configuration for the Polish launch. Prices and carriers are editable later in the back office.
INSERT INTO shipping_methods (id, code, name, i18n, carrier, price_minor, currency, requires_pickup_point, days_min, days_max, sort_order) VALUES
  (gen_random_uuid(), 'INPOST_LOCKER',  'InPost Paczkomat', '{"pl":{"name":"Paczkomat InPost"}}',  'INPOST', 1499, 'PLN', TRUE,  1, 2, 1),
  (gen_random_uuid(), 'INPOST_COURIER', 'InPost courier',   '{"pl":{"name":"Kurier InPost"}}',     'INPOST', 1699, 'PLN', FALSE, 1, 2, 2),
  (gen_random_uuid(), 'DPD_COURIER',    'DPD courier',      '{"pl":{"name":"Kurier DPD"}}',        'DPD',    1899, 'PLN', FALSE, 1, 3, 3);

INSERT INTO quantity_discount_tiers (min_quantity, percent) VALUES (10, 5), (25, 10), (50, 15), (100, 20);
