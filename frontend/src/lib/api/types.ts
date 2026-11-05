// Mirrors the backend DTOs in com.musfyr.print.*.dto. Keep in sync with /v3/api-docs.

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ColorView {
  code: string;
  name: string;
  hex: string;
}

export type ProductFamily = "APPAREL" | "STICKER" | "MERCH";

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  categorySlug: string;
  categoryName: string;
  productFamily: ProductFamily;
  garmentType: string;
  ageGroup: string;
  gender: string;
  fit: string;
  priceFrom: Money;
  compareAt: Money | null;
  featured: boolean;
  customizable: boolean;
  isNew: boolean;
  inStock: boolean;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  colors: ColorView[];
}

export interface CategoryView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productFamily: ProductFamily;
  accentHex: string | null;
  parentSlug: string | null;
  productCount: number;
}

export interface CollectionView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  accentHex: string | null;
  productCount: number;
}

export type Availability = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNAVAILABLE";

export interface VariantView {
  id: string;
  sku: string;
  colorCode: string | null;
  sizeCode: string;
  price: Money;
  availability: Availability;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  productFamily: ProductFamily;
  garmentType: string;
  ageGroup: string;
  gender: string;
  fit: string;
  material: string | null;
  priceFrom: Money;
  basePrice: Money;
  compareAt: Money | null;
  customizable: boolean;
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  modelKey: string | null;
  productionTime: { minDays: number; maxDays: number };
  breadcrumbs: { slug: string; name: string }[];
  colors: ColorView[];
  sizes: { code: string; available: boolean }[];
  variants: VariantView[];
  optionGroups: {
    code: string;
    name: string;
    required: boolean;
    values: { code: string; label: string; priceDeltaMinor: number }[];
  }[];
  printAreas: {
    code: string;
    name: string;
    widthMm: number;
    heightMm: number;
    safeMarginMm: number;
    minDpi: number;
    priceDeltaMinor: number;
  }[];
  printMethods: { code: string; name: string; description: string | null; priceDeltaMinor: number; isDefault: boolean }[];
  images: { url: string; altText: string; colorCode: string | null }[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface Facets {
  colors: ColorView[];
  families: FacetCount[];
  ageGroups: FacetCount[];
  genders: FacetCount[];
  fits: FacetCount[];
  minPrice: Money | null;
  maxPrice: Money | null;
}

export interface Suggestion {
  type: "PRODUCT" | "CATEGORY";
  slug: string;
  label: string;
  context: string | null;
}

export interface PromotionView {
  code: string | null;
  title: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  discountValue: number;
  minOrderMinor: number;
  currency: string | null;
  endsAt: string | null;
}

export interface ReviewView {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
  productSlug: string;
  productName: string;
}

export interface HomePage {
  featured: ProductSummary[];
  newArrivals: ProductSummary[];
  trending: ProductSummary[];
  baby: ProductSummary[];
  familyMatching: ProductSummary[];
  business: ProductSummary[];
  categories: CategoryView[];
  collections: CollectionView[];
  promotions: PromotionView[];
  reviews: ReviewView[];
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface Session {
  user: SessionUser;
  expiresAt: string;
}

export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  correlationId?: string;
  errors?: { field: string; message: string }[];
}

export type SizeSystem = "EU" | "UK" | "US" | "CN" | "IN";

export interface MeasureRange {
  min: number | null;
  max: number | null;
}

export interface SizeChartRow {
  sizeCode: string;
  ageMinMonths: number | null;
  ageMaxMonths: number | null;
  height: MeasureRange | null;
  chest: MeasureRange | null;
  waist: MeasureRange | null;
  garmentWidth: number | null;
  garmentLength: number | null;
  labels: Partial<Record<SizeSystem, string>>;
}

export interface SizeChart {
  source: "REFERENCE" | "SUPPLIER";
  supplierName: string | null;
  fitNote: string | null;
  systems: SizeSystem[];
  rows: SizeChartRow[];
}

export interface SizeRecommendation {
  sizeCode: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  alternativeSizeCode: string | null;
  reasons: string[];
}

// ------------------------------------------------------------------------------------------- commerce

export interface ShippingMethod {
  code: string;
  name: string;
  carrier: string;
  priceMinor: number;
  currency: string;
  requiresPickupPoint: boolean;
  daysMin: number;
  daysMax: number;
}

export interface CartLine {
  id: string;
  variantId: string;
  productSlug: string;
  productName: string;
  garmentType: string;
  sku: string;
  colorCode: string | null;
  colorName: string | null;
  colorHex: string | null;
  sizeCode: string;
  quantity: number;
  options: Record<string, string>;
  designId: string | null;
  printZones: string[];
  unitPrice: Money;
  lineTotal: Money;
  volumePercent: number;
  available: boolean;
  stockShortfall: number;
  designErrors: { zone: string | null; code: string; severity: string; value: number | null }[];
}

export interface Cart {
  id: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: Money;
  promotionCode: string | null;
  promotionError: string | null;
  discount: Money;
  shipping: Money;
  total: Money;
  taxMode: "EXEMPT" | "STANDARD";
  taxIncluded: Money;
  shippingMethods: ShippingMethod[];
  shippingMethod: string | null;
}

export interface OrderView {
  number: string;
  status: string;
  email: string;
  createdAt: string;
  paidAt: string | null;
  subtotal: Money;
  discount: Money;
  shipping: Money;
  total: Money;
  taxMode: string;
  taxIncluded: Money;
  promotionCode: string | null;
  shippingMethod: string;
  pickupPoint: string | null;
  shippingAddress: Record<string, string | null>;
  items: { productName: string; sku: string; colorCode: string | null; sizeCode: string; quantity: number; unitPrice: Money; lineTotal: Money; options: Record<string, unknown>; printZones: string[]; designId: string | null }[];
  events: { status: string; note: string | null; at: string }[];
  canPay: boolean;
  paymentStatus: string | null;
}

export interface OrderSummary {
  number: string;
  status: string;
  email: string;
  total: Money;
  itemCount: number;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  phone: string | null;
  emailVerified: boolean;
  marketingOptIn: boolean;
  preferredSizeSystem: string | null;
  preferredLocale: string | null;
  deletionRequested: boolean;
  roles: string[];
}

export interface Address {
  id: string;
  fullName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}
