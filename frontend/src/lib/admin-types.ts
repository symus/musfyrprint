import type { ColorView, Money } from "./api/types";

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  productFamily: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  basePrice: Money;
  featured: boolean;
  variantCount: number;
  totalStock: number;
  updatedAt: string;
}

export interface AdminVariant {
  id: string;
  sku: string;
  colorCode: string | null;
  sizeCode: string;
  priceMinor: number | null;
  effectivePriceMinor: number;
  stockQuantity: number;
  trackInventory: boolean;
  active: boolean;
  availability: string;
  version: number;
}

export interface AdminProductDetail {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  productFamily: string;
  garmentType: string;
  ageGroup: string;
  gender: string;
  fit: string;
  material: string | null;
  basePriceMinor: number;
  compareAtMinor: number | null;
  currency: string;
  productionDaysMin: number;
  productionDaysMax: number;
  customizable: boolean;
  featured: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  tags: string[];
  modelKey: string | null;
  colors: ColorView[];
  variants: AdminVariant[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  productFamily: string;
  active: boolean;
}

export interface AdminColor {
  id: string;
  code: string;
  name: string;
  hex: string;
}

export interface QuoteView {
  id: string;
  reference: string;
  contactName: string;
  email: string;
  phone: string | null;
  company: string | null;
  productInterest: string;
  quantity: number;
  neededBy: string | null;
  message: string | null;
  status: "NEW" | "IN_REVIEW" | "QUOTED" | "WON" | "LOST";
  createdAt: string;
}

export interface AuditEntry {
  id: number;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export const GARMENT_TYPES = ["TSHIRT", "LONGSLEEVE", "TANK", "HOODIE", "SWEATSHIRT", "BODYSUIT", "TOTE", "STICKER_DIE_CUT", "STICKER_SHEET", "STICKER_LABEL", "NONE"];
export const AGE_GROUPS = ["BABY", "TODDLER", "KIDS", "TEEN", "ADULT", "NA"];
export const GENDERS = ["MEN", "WOMEN", "UNISEX", "NA"];
export const FITS = ["REGULAR", "SLIM", "FITTED", "OVERSIZED", "RELAXED", "NA"];
export const FAMILIES = ["APPAREL", "STICKER", "MERCH"];
