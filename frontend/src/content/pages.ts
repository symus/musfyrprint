import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";

/**
 * Help and policy content. Legal texts are TEMPLATES that must be reviewed by a lawyer for every target
 * market before launch (consumer rights for personalised goods differ between countries).
 */
export interface ContentPage {
  title: string;
  description: string;
  legalReviewRequired?: boolean;
  sections: { heading: string; body: string[] }[];
}

const EN: Record<string, ContentPage> = {
  faq: {
    title: "Frequently asked questions",
    description: "Answers about designing, printing, sizing, delivery and returns.",
    sections: [
      { heading: "How long does production take?", body: ["Each product page shows its production time (usually 2–6 business days). Delivery time is added on top and depends on the shipping method chosen at checkout."] },
      { heading: "Which files can I upload?", body: ["PNG, JPG and SVG artwork is supported. For sharp prints, use at least the resolution shown for the print area (typically 150–300 DPI at final size). We check every file before printing and contact you if something needs attention."] },
      { heading: "How do I choose the right size?", body: ["Use the garment measurements rather than the size label alone – labels differ between countries and manufacturers. Age-based children's sizes are approximate."] },
      { heading: "Will the colours look exactly like on screen?", body: ["Screens display colour differently and fabrics absorb ink in different ways, so printed colours can vary slightly from the preview."] },
      { heading: "Do you offer bulk discounts?", body: ["Yes. For 10 or more pieces, request a quote on our Business & bulk page."] },
    ],
  },
  shipping: {
    title: "Shipping information",
    description: "Delivery methods, times and costs.",
    sections: [
      { heading: "Where we ship", body: [`${brand.name} ships from Poland. Available destinations, carriers and prices are shown at checkout for your address.`] },
      { heading: "Delivery times", body: ["Estimated delivery dates combine the product's production time with the carrier's transit time. Estimates are not guaranteed, especially during peak seasons."] },
      { heading: "Tracking", body: ["You will receive a tracking link when your parcel is dispatched. Where a carrier does not offer live tracking, we show the latest status recorded by our team."] },
    ],
  },
  returns: {
    title: "Returns & refunds",
    description: "What to do if something isn't right.",
    legalReviewRequired: true,
    sections: [
      { heading: "Faulty or incorrect items", body: ["If your item arrives damaged, misprinted or differs from your order, contact us within 14 days with your order number and photos. We will reprint or refund it."] },
      { heading: "Personalised products", body: ["Statutory withdrawal rights for goods made to the customer's specifications vary by country. This section must be completed after legal review for each market you sell to."] },
      { heading: "Non-personalised products", body: ["Unworn, non-personalised items can be returned within the statutory withdrawal period applicable in your country."] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "How we process your personal data.",
    legalReviewRequired: true,
    sections: [
      { heading: "Controller", body: [`${brand.name}, ${brand.address}. Contact: ${brand.supportEmail}.`] },
      { heading: "What we process and why", body: ["Account and order data to fulfil contracts; uploaded artwork to produce your order; newsletter data only with your consent; technical logs to keep the service secure."] },
      { heading: "Your rights", body: ["You may request access, correction, deletion, restriction, portability and object to processing, and withdraw consent at any time. You can also complain to your data-protection authority (in Poland: UODO)."] },
      { heading: "Retention", body: ["Order records are kept as long as required by tax and accounting law; marketing data until you unsubscribe."] },
    ],
  },
  terms: {
    title: "Terms of sale",
    description: "Terms that apply to orders.",
    legalReviewRequired: true,
    sections: [
      { heading: "Contract", body: ["A contract is concluded when we confirm your paid order by e-mail. Prices include VAT where applicable; shipping costs are shown before payment."] },
      { heading: "Your content", body: ["You confirm you own or have permission to use any artwork, text, logos or photos you upload, and that it does not violate our content policy."] },
    ],
  },
  cookies: {
    title: "Cookie policy",
    description: "Cookies and similar technologies we use.",
    legalReviewRequired: true,
    sections: [
      { heading: "Strictly necessary cookies", body: ["mp_at (session, HttpOnly) keeps you signed in; XSRF-TOKEN protects forms against cross-site request forgery; NEXT_LOCALE remembers your language. These do not require consent."] },
      { heading: "Analytics and marketing", body: ["None are set today. If added, they will only load after you opt in through the cookie preferences banner."] },
    ],
  },
  "content-policy": {
    title: "Artwork & content policy",
    description: "What we can and cannot print.",
    sections: [
      { heading: "Rights to your artwork", body: ["Upload only content you created or are licensed to use. We do not print copyrighted characters, trademarks or logos without the owner's permission."] },
      { heading: "Prohibited content", body: ["Hate speech, harassment, violent extremism, sexual content involving minors, and content that infringes privacy or intellectual-property rights are not accepted. Orders may be reviewed and refused."] },
      { heading: "Copyright complaints", body: [`If you believe a design infringes your rights, e-mail ${brand.supportEmail} with the order or design link, proof of ownership and your contact details.`] },
    ],
  },
  contact: {
    title: "Contact us",
    description: "Get in touch with our team.",
    sections: [
      { heading: "E-mail", body: [brand.supportEmail] },
      { heading: "Phone", body: [brand.supportPhone] },
      { heading: "Address", body: [brand.address] },
      { heading: "Bulk & business", body: ["For orders of 10 pieces or more, please use the quote form on our Business & bulk page for the fastest reply."] },
    ],
  },
};

const PL: Record<string, ContentPage> = {
  faq: {
    title: "Najczęściej zadawane pytania",
    description: "Odpowiedzi na pytania o projektowanie, druk, rozmiary, dostawę i zwroty.",
    sections: [
      { heading: "Jak długo trwa realizacja?", body: ["Każda strona produktu pokazuje czas realizacji (zwykle 2–6 dni roboczych). Do tego dochodzi czas dostawy, zależny od metody wybranej przy zamówieniu."] },
      { heading: "Jakie pliki mogę wgrać?", body: ["Obsługujemy grafiki PNG, JPG i SVG. Aby nadruk był ostry, użyj co najmniej rozdzielczości podanej dla pola nadruku (zwykle 150–300 DPI w docelowym rozmiarze). Sprawdzamy każdy plik przed drukiem i skontaktujemy się, jeśli coś wymaga poprawy."] },
      { heading: "Jak wybrać właściwy rozmiar?", body: ["Kieruj się wymiarami produktu, a nie samym oznaczeniem rozmiaru – oznaczenia różnią się między krajami i producentami. Rozmiary dziecięce według wieku są orientacyjne."] },
      { heading: "Czy kolory będą dokładnie takie jak na ekranie?", body: ["Ekrany wyświetlają kolory różnie, a tkaniny różnie przyjmują tusz, dlatego wydrukowane kolory mogą nieznacznie różnić się od podglądu."] },
      { heading: "Czy oferujecie rabaty hurtowe?", body: ["Tak. Przy zamówieniach od 10 sztuk poproś o wycenę na stronie Dla firm i hurt."] },
    ],
  },
  shipping: {
    title: "Informacje o dostawie",
    description: "Metody, terminy i koszty dostawy.",
    sections: [
      { heading: "Dokąd wysyłamy", body: [`${brand.name} wysyła z Polski. Dostępne kraje, przewoźnicy i ceny są widoczne przy zamówieniu dla Twojego adresu.`] },
      { heading: "Terminy dostawy", body: ["Szacowana data dostawy łączy czas realizacji produktu z czasem transportu przewoźnika. Szacunki nie są gwarantowane, zwłaszcza w okresach wzmożonego ruchu."] },
      { heading: "Śledzenie przesyłki", body: ["Po nadaniu paczki otrzymasz link do śledzenia. Jeśli przewoźnik nie udostępnia śledzenia na żywo, pokazujemy ostatni status zarejestrowany przez nasz zespół."] },
    ],
  },
  returns: {
    title: "Zwroty i reklamacje",
    description: "Co zrobić, jeśli coś jest nie tak.",
    legalReviewRequired: true,
    sections: [
      { heading: "Produkty wadliwe lub niezgodne z zamówieniem", body: ["Jeśli produkt dotarł uszkodzony, z błędnym nadrukiem lub niezgodny z zamówieniem, skontaktuj się z nami w ciągu 14 dni, podając numer zamówienia i zdjęcia. Wydrukujemy go ponownie lub zwrócimy pieniądze."] },
      { heading: "Produkty personalizowane", body: ["Ustawowe prawo odstąpienia od umowy w przypadku towarów wyprodukowanych według specyfikacji klienta różni się w zależności od kraju. Ta sekcja musi zostać uzupełniona po weryfikacji prawnej dla każdego rynku."] },
      { heading: "Produkty bez personalizacji", body: ["Nienoszone produkty bez personalizacji możesz zwrócić w ustawowym terminie odstąpienia od umowy obowiązującym w Twoim kraju."] },
    ],
  },
  privacy: {
    title: "Polityka prywatności",
    description: "Jak przetwarzamy Twoje dane osobowe.",
    legalReviewRequired: true,
    sections: [
      { heading: "Administrator", body: [`${brand.name}, ${brand.address}. Kontakt: ${brand.supportEmail}.`] },
      { heading: "Jakie dane przetwarzamy i dlaczego", body: ["Dane konta i zamówień – w celu realizacji umowy; wgrane grafiki – w celu wykonania zamówienia; dane do newslettera – wyłącznie za Twoją zgodą; logi techniczne – w celu zapewnienia bezpieczeństwa usługi."] },
      { heading: "Twoje prawa", body: ["Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz sprzeciwu, a także do wycofania zgody w dowolnym momencie. Możesz też złożyć skargę do Prezesa UODO."] },
      { heading: "Okres przechowywania", body: ["Dokumentację zamówień przechowujemy tak długo, jak wymagają tego przepisy podatkowe i rachunkowe; dane marketingowe – do czasu wypisania się."] },
    ],
  },
  terms: {
    title: "Regulamin sprzedaży",
    description: "Zasady obowiązujące przy zamówieniach.",
    legalReviewRequired: true,
    sections: [
      { heading: "Umowa", body: ["Umowa zostaje zawarta z chwilą potwierdzenia opłaconego zamówienia e-mailem. Ceny zawierają VAT, jeśli dotyczy; koszty dostawy są widoczne przed płatnością."] },
      { heading: "Twoje treści", body: ["Potwierdzasz, że jesteś właścicielem lub masz prawo do używania wgranych grafik, tekstów, logotypów i zdjęć oraz że nie naruszają one naszych zasad dotyczących treści."] },
    ],
  },
  cookies: {
    title: "Polityka cookies",
    description: "Pliki cookie i podobne technologie, których używamy.",
    legalReviewRequired: true,
    sections: [
      { heading: "Niezbędne pliki cookie", body: ["mp_at (sesja, HttpOnly) utrzymuje zalogowanie; XSRF-TOKEN chroni formularze przed atakami CSRF; NEXT_LOCALE zapamiętuje wybrany język. Nie wymagają one zgody."] },
      { heading: "Analityka i marketing", body: ["Obecnie nie są ustawiane. Jeśli zostaną dodane, załadują się dopiero po wyrażeniu zgody w ustawieniach cookies."] },
    ],
  },
  "content-policy": {
    title: "Zasady dotyczące grafik i treści",
    description: "Co możemy, a czego nie możemy wydrukować.",
    sections: [
      { heading: "Prawa do grafik", body: ["Wgrywaj wyłącznie treści, które stworzyłeś lub na które masz licencję. Nie drukujemy postaci chronionych prawem autorskim, znaków towarowych ani logotypów bez zgody właściciela."] },
      { heading: "Treści zabronione", body: ["Nie przyjmujemy mowy nienawiści, nękania, treści ekstremistycznych, treści seksualnych z udziałem nieletnich ani treści naruszających prywatność lub prawa własności intelektualnej. Zamówienia mogą być weryfikowane i odrzucane."] },
      { heading: "Zgłoszenia naruszeń praw autorskich", body: [`Jeśli uważasz, że projekt narusza Twoje prawa, napisz na ${brand.supportEmail}, podając link do zamówienia lub projektu, dowód praw i dane kontaktowe.`] },
    ],
  },
  contact: {
    title: "Kontakt",
    description: "Skontaktuj się z naszym zespołem.",
    sections: [
      { heading: "E-mail", body: [brand.supportEmail] },
      { heading: "Telefon", body: [brand.supportPhone] },
      { heading: "Adres", body: [brand.address] },
      { heading: "Firmy i hurt", body: ["Przy zamówieniach od 10 sztuk najszybciej odpowiemy przez formularz wyceny na stronie Dla firm i hurt."] },
    ],
  },
};

export const PAGE_SLUGS = Object.keys(EN);

export function getPages(locale: Locale): Record<string, ContentPage> {
  return locale === "pl" ? PL : EN;
}
