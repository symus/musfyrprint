import { brand } from "@/config/brand";

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

export const PAGES: Record<string, ContentPage> = {
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
      { heading: "Strictly necessary cookies", body: ["mp_at (session, HttpOnly) keeps you signed in; XSRF-TOKEN protects forms against cross-site request forgery. These do not require consent."] },
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
