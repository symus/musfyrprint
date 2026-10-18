-- Polish translations for the demo catalogue (dev/test only).

CREATE FUNCTION pg_temp.tr(p_table TEXT, p_key_col TEXT, p_key TEXT, p_doc JSONB) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    EXECUTE format('UPDATE %I SET i18n = i18n || jsonb_build_object(''pl'', $1) WHERE %I = $2', p_table, p_key_col)
        USING p_doc, p_key;
END $$;

-- Categories
SELECT pg_temp.tr('categories', 'slug', 't-shirts', '{"name":"Koszulki","description":"Klasyczne, dopasowane i oversize – gotowe na Twój projekt."}');
SELECT pg_temp.tr('categories', 'slug', 'hoodies-sweatshirts', '{"name":"Bluzy","description":"Ciepłe bluzy z kapturem i bez na każdą porę roku."}');
SELECT pg_temp.tr('categories', 'slug', 'baby', '{"name":"Niemowlęta","description":"Miękkie body i koszulki dla najmłodszych członków rodziny."}');
SELECT pg_temp.tr('categories', 'slug', 'kids-teens', '{"name":"Dzieci i nastolatki","description":"Wytrzymałe, wesołe kroje do szkoły, na sport i weekendy."}');
SELECT pg_temp.tr('categories', 'slug', 'stickers', '{"name":"Naklejki","description":"Naklejki wycinane po konturze, arkusze, przezroczyste i wodoodporne."}');
SELECT pg_temp.tr('categories', 'slug', 'bags-merch', '{"name":"Torby i gadżety","description":"Torby i gadżety dla firm i na prezent."}');

-- Collections
SELECT pg_temp.tr('collections', 'slug', 'birthday-gifts', '{"name":"Prezenty urodzinowe","description":"Personalizowane koszulki, bluzy i naklejki, które sprawią, że urodziny będą niezapomniane."}');
SELECT pg_temp.tr('collections', 'slug', 'family-matching', '{"name":"Rodzinne stylizacje","description":"Pasujące do siebie projekty dla rodziców, dzieci i niemowląt – na wakacje i rodzinne zjazdy."}');
SELECT pg_temp.tr('collections', 'slug', 'baby-shower', '{"name":"Baby shower i noworodek","description":"Delikatne, organiczne ubranka na ogłoszenia i pierwsze sesje zdjęciowe."}');
SELECT pg_temp.tr('collections', 'slug', 'business-merch', '{"name":"Gadżety firmowe","description":"Odzież, torby i etykiety z logo dla zespołów, na eventy i do pakowania."}');
SELECT pg_temp.tr('collections', 'slug', 'school-and-teams', '{"name":"Szkoły, kluby i drużyny","description":"Ubierz klasę, klub lub drużynę – z imionami i numerami."}');

-- Colours
SELECT pg_temp.tr('colors', 'code', code, jsonb_build_object('name', pl)) FROM (VALUES
  ('white','Biały'),('black','Czarny'),('heather-grey','Szary melanż'),('navy','Granatowy'),('coral','Koralowy'),
  ('sunflower','Słonecznikowy'),('mint','Miętowy'),('lavender','Lawendowy'),('forest','Leśna zieleń'),
  ('baby-pink','Pudrowy róż'),('sky','Błękitny'),('natural','Naturalny'),('clear','Przezroczysty')) AS t(code, pl);

-- Print methods
SELECT pg_temp.tr('print_methods', 'code', 'DTG', '{"name":"Druk bezpośredni (DTG)","description":"Tusze wodne wnikające w bawełnę. Najlepszy do szczegółowych, wielokolorowych grafik."}');
SELECT pg_temp.tr('print_methods', 'code', 'DTF', '{"name":"Druk transferowy (DTF)","description":"Nadruk na folii wprasowany w materiał. Intensywne kolory na bawełnie, mieszankach i poliestrze."}');
SELECT pg_temp.tr('print_methods', 'code', 'SCREEN', '{"name":"Sitodruk","description":"Druk kolorami dodatkowymi przy większych nakładach. Najbardziej opłacalny od ok. 30 sztuk."}');
SELECT pg_temp.tr('print_methods', 'code', 'HEAT_TRANSFER', '{"name":"Flex (folia termotransferowa)","description":"Wycinane imiona i numery. Idealne na stroje sportowe."}');
SELECT pg_temp.tr('print_methods', 'code', 'SUBLIMATION', '{"name":"Sublimacja","description":"Barwnik wnikający w jasny poliester. Nie nadaje się do bawełny ani ciemnych tkanin."}');
SELECT pg_temp.tr('print_methods', 'code', 'DIGITAL_STICKER', '{"name":"Cyfrowy druk naklejek","description":"Pełnokolorowy druk na winylu lub folii z wycinaniem po konturze."}');

-- Print areas
SELECT pg_temp.tr('print_areas', 'code', code, jsonb_build_object('name', pl)) FROM (VALUES
  ('FRONT','Przód'),('BACK','Tył'),('LEFT_CHEST','Lewa pierś'),('RIGHT_CHEST','Prawa pierś'),
  ('LEFT_SLEEVE','Lewy rękaw'),('RIGHT_SLEEVE','Prawy rękaw'),('FULL','Cała naklejka'),('SHEET','Arkusz naklejek')) AS t(code, pl);

-- Option groups & values
SELECT pg_temp.tr('product_option_groups', 'code', code, jsonb_build_object('name', pl)) FROM (VALUES
  ('finish','Wykończenie'),('material','Materiał'),('shape','Kształt')) AS t(code, pl);
SELECT pg_temp.tr('product_option_values', 'code', code, jsonb_build_object('label', pl)) FROM (VALUES
  ('gloss','Błysk'),('matte','Mat'),('holographic','Holograficzne'),('vinyl','Winyl'),('waterproof','Winyl wodoodporny'),
  ('paper','Papier (do wnętrz)'),('circle','Koło'),('rectangle','Zaokrąglony prostokąt')) AS t(code, pl);
UPDATE product_option_values v SET i18n = jsonb_set(v.i18n, '{pl,label}', '"Winyl (odporny na wodę)"')
FROM product_option_groups g JOIN products p ON p.id = g.product_id
WHERE v.group_id = g.id AND p.slug = 'custom-logo-labels' AND v.code = 'vinyl';

-- Promotions
SELECT pg_temp.tr('promotions', 'code', 'WELCOME10', '{"title":"10% zniżki na pierwszy projekt","description":"Jesteś tu pierwszy raz? Użyj kodu WELCOME10 przy pierwszym zamówieniu."}');
SELECT pg_temp.tr('promotions', 'code', 'FREESHIP199', '{"title":"Darmowa dostawa od 199 zł","description":"Darmowa dostawa standardowa w Polsce przy zamówieniach powyżej 199 zł."}');

-- Products
SELECT pg_temp.tr('products', 'slug', slug, jsonb_build_object('name', n, 'short_description', s, 'description', d)) FROM (VALUES
  ('classic-unisex-tee', 'Klasyczna koszulka unisex', 'Codzienna koszulka o regularnym kroju z miękkiej bawełny czesanej.',
   'Niezawodna koszulka z okrągłym dekoltem, regularnym krojem, wzmocnionymi ramionami i odrywaną metką. Gładka powierzchnia świetnie przyjmuje szczegółowe nadruki.'),
  ('womens-fitted-tee', 'Damska koszulka dopasowana', 'Taliowana, nieco dłuższa koszulka o kobiecym kroju.',
   'Krój bliżej ciała, delikatnie wycięty okrągły dekolt i boczne szwy. Lekka i przewiewna na ciepłe dni.'),
  ('mens-oversized-tee', 'Koszulka oversize heavyweight', 'Obniżone ramiona, pudełkowy krój i gruba bawełna.',
   'Inspirowana streetwearem gruba koszulka z prążkowanym kołnierzem i obniżonymi ramionami. Dla bliższego dopasowania wybierz rozmiar mniejszy.'),
  ('long-sleeve-tee', 'Koszulka z długim rękawem', 'Komfort klasycznej koszulki – z długim rękawem.',
   'Koszulka o regularnym kroju z prążkowanymi mankietami. Nadruk na piersi, plecach lub wzdłuż rękawa.'),
  ('organic-tank-top', 'Organiczny tank top', 'Przewiewny luźny top na lato, siłownię i festiwale.',
   'Luźny top z głębokimi podkrojami pach, uszyty z certyfikowanej bawełny organicznej.'),
  ('pullover-hoodie', 'Bluza z kapturem', 'Bluza z kieszenią kangurką i podwójnym kapturem.',
   'Ciepła bluza średniej gramatury z drapanym wnętrzem, płaskimi sznurkami i prążkowanymi mankietami. Świetna na gadżety dla drużyn i eventów.'),
  ('crewneck-sweatshirt', 'Bluza bez kaptura', 'Prosta, luźna bluza, która pasuje do wszystkiego.',
   'Miękka, drapana dzianina z prążkowanym dekoltem, mankietami i ściągaczem.'),
  ('baby-bodysuit', 'Body niemowlęce', 'Body z krótkim rękawem, kopertowym dekoltem i zatrzaskami.',
   'Bardzo miękkie body z kopertowym dekoltem ułatwiającym ubieranie i zatrzaskami bez niklu. Drukowane tuszami wodnymi.'),
  ('baby-tee', 'Koszulka dla niemowląt i maluchów', 'Mała klasyczna koszulka dla niemowląt i maluchów.',
   'Kopertowy dekolt łatwo przechodzi przez główkę. Miękka, wytrzymała i łatwa w praniu.'),
  ('kids-tee', 'Koszulka dziecięca', 'Wytrzymała, wygodna koszulka na podwórkowe przygody.',
   'Wzmocniony kołnierz, podwójne przeszycia i regularny krój dający swobodę ruchu.'),
  ('teen-tee', 'Koszulka dla nastolatków', 'Rozmiary młodzieżowe w kroju dla dorosłych.',
   'Rozmiary na 12–16 lat, nieco dłuższy korpus i nowoczesny dekolt.'),
  ('kids-hoodie', 'Bluza dziecięca z kapturem', 'Ciepła bluza z bezpiecznym kapturem bez sznurków.',
   'Kaptur bez sznurków, kieszeń kangurka i drapane wnętrze. Idealna dla szkolnych klubów i drużyn.'),
  ('everyday-tote', 'Bawełniana torba na co dzień', 'Mocna płócienna torba z długimi uchwytami.',
   'Gruba płócienna torba ze wzmocnionymi uchwytami. Ulubiona na eventy, w sklepach i na konferencjach.'),
  ('die-cut-vinyl-sticker', 'Naklejka winylowa wycinana po konturze', 'Wycięta dokładnie w kształt Twojego projektu. Zestaw 10 szt.',
   'Trwały winyl z laminatem chroniącym przed zarysowaniami i słońcem. Wycinany po konturze grafiki.'),
  ('kiss-cut-sticker-sheet', 'Arkusz naklejek kiss-cut', 'Wiele naklejek na jednym arkuszu A5.',
   'Umieść kilka projektów na jednym arkuszu A5. Podkład pozostaje nienaruszony, więc naklejki łatwo się odklejają.'),
  ('transparent-sticker', 'Naklejka przezroczysta', 'Naklejki na przezroczystej folii – widać tylko grafikę. Zestaw 10 szt.',
   'Druk na krystalicznie przezroczystej folii. Podkład z białego tuszu zachowuje intensywne kolory na szkle i laptopach.'),
  ('kids-name-sticker-pack', 'Naklejki z imieniem dla dzieci', '60 wodoodpornych naklejek z imieniem na przybory szkolne.',
   'Naklejki odporne na zmywarkę – na bidony, śniadaniówki i książki. Dodaj imię i wesołą ikonkę.'),
  ('custom-logo-labels', 'Etykiety z logo (rolka 250 szt.)', 'Etykiety firmowe na opakowania, słoiki i paczki.',
   'Okrągłe lub prostokątne etykiety na rolce, idealne dla małych firm i do pakowania.')
) AS t(slug, n, s, d);
