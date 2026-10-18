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
