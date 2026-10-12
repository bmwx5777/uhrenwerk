import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps, tsvector } from "./_shared";
import {
  productConditionEnum,
  productKindEnum,
  productStatusEnum,
  unitConditionGradeEnum,
  unitStatusEnum,
  vatSchemeEnum,
} from "./enums";

/** Технические характеристики часов. jsonb: набор полей зависит от модели. */
export type ProductSpecs = {
  movement?: "automatic" | "manual" | "quartz" | "spring_drive" | "solar";
  caliber?: string;
  powerReserveHours?: number;
  caseMaterial?: string;
  caseDiameterMm?: number;
  caseThicknessMm?: number;
  lugWidthMm?: number;
  waterResistanceM?: number;
  crystal?: string;
  dialColor?: string;
  braceletMaterial?: string;
  complications?: string[];
  gender?: "men" | "women" | "unisex";
};

export const brand = pgTable(
  "brand",
  {
    id: primaryId(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    description: text("description"),
    countryCode: char("country_code", { length: 2 }),
    foundedYear: smallint("founded_year"),
    isFeatured: boolean("is_featured").notNull().default(false),
    position: smallint("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("brand_slug_unique").on(t.slug),
    uniqueIndex("brand_name_unique").on(t.name),
    index("brand_featured_idx").on(t.isFeatured),
  ],
);

export const category = pgTable(
  "category",
  {
    id: primaryId(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    parentId: uuid("parent_id").references((): AnyPgColumn => category.id, {
      onDelete: "set null",
    }),
    position: smallint("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("category_slug_unique").on(t.slug),
    index("category_parent_idx").on(t.parentId),
    check("category_not_self_parent", sql`${t.parentId} IS DISTINCT FROM ${t.id}`),
  ],
);

/**
 * Каталожная единица — модель часов.
 *
 * `kind = 'stocked'`    → взаимозаменяемый запас: цена в `priceCents`, количество в `inventory`.
 * `kind = 'serialized'` → уникальные экземпляры в `productUnit`, у каждого своя цена
 *                         и состояние; `priceCents` может быть NULL, на витрине
 *                         показываем «от» = минимум среди доступных экземпляров.
 *
 * Все цены — НЕТТО (без НДС), в центах. НДС считает сервер по стране доставки.
 */
export const product = pgTable(
  "product",
  {
    id: primaryId(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    /** Заводской референс, например 310.30.42.50.01.001 */
    reference: text("reference"),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    kind: productKindEnum("kind").notNull().default("stocked"),
    status: productStatusEnum("status").notNull().default("draft"),
    condition: productConditionEnum("condition").notNull().default("new"),
    vatScheme: vatSchemeEnum("vat_scheme").notNull().default("standard"),
    shortDescription: text("short_description"),
    description: text("description"),
    priceCents: integer("price_cents"),
    compareAtPriceCents: integer("compare_at_price_cents"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    isFeatured: boolean("is_featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    specs: jsonb("specs").$type<ProductSpecs>().notNull().default({}),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(reference, '') || ' ' || coalesce(short_description, ''))`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_slug_unique").on(t.slug),
    uniqueIndex("product_sku_unique").on(t.sku),
    index("product_brand_idx").on(t.brandId),
    index("product_category_idx").on(t.categoryId),
    index("product_status_published_idx").on(t.status, t.publishedAt.desc()),
    index("product_price_idx").on(t.priceCents),
    index("product_search_idx").using("gin", t.searchVector),
    index("product_featured_idx")
      .on(t.isFeatured)
      .where(sql`${t.status} = 'active'`),
    check(
      "product_price_positive",
      sql`${t.priceCents} IS NULL OR ${t.priceCents} > 0`,
    ),
    check(
      "product_compare_price_higher",
      sql`${t.compareAtPriceCents} IS NULL OR ${t.priceCents} IS NULL OR ${t.compareAtPriceCents} > ${t.priceCents}`,
    ),
    // Обычный товар обязан иметь цену; у уникальных экземпляров цена в product_unit.
    check(
      "product_stocked_requires_price",
      sql`${t.kind} <> 'stocked' OR ${t.priceCents} IS NOT NULL`,
    ),
  ],
);

/** Физический экземпляр часов (pre-owned / лимитированный). Количество всегда 1. */
export const productUnit = pgTable(
  "product_unit",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    /** Внутренний код экземпляра, например UW-U-000142 */
    unitCode: text("unit_code").notNull(),
    serialNumber: text("serial_number"),
    productionYear: smallint("production_year"),
    conditionGrade: unitConditionGradeEnum("condition_grade")
      .notNull()
      .default("excellent"),
    hasBox: boolean("has_box").notNull().default(false),
    hasPapers: boolean("has_papers").notNull().default(false),
    papersDate: date("papers_date"),
    warrantyMonths: smallint("warranty_months").notNull().default(24),
    priceCents: integer("price_cents").notNull(),
    /** Закупочная цена — для НДС по схеме маржи. Наружу никогда не отдаётся. */
    costCents: integer("cost_cents"),
    /** Переопределяет product.vatScheme для этого экземпляра. */
    vatScheme: vatSchemeEnum("vat_scheme"),
    status: unitStatusEnum("status").notNull().default("available"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_unit_code_unique").on(t.unitCode),
    uniqueIndex("product_unit_serial_unique")
      .on(t.serialNumber)
      .where(sql`${t.serialNumber} IS NOT NULL`),
    index("product_unit_product_idx").on(t.productId),
    index("product_unit_product_status_idx").on(t.productId, t.status),
    index("product_unit_price_idx").on(t.priceCents),
    check("product_unit_price_positive", sql`${t.priceCents} > 0`),
    check(
      "product_unit_cost_non_negative",
      sql`${t.costCents} IS NULL OR ${t.costCents} >= 0`,
    ),
    check(
      "product_unit_year_plausible",
      sql`${t.productionYear} IS NULL OR (${t.productionYear} BETWEEN 1850 AND 2100)`,
    ),
  ],
);

/** Фото модели (`productUnitId IS NULL`) либо фото конкретного экземпляра. */
export const productImage = pgTable(
  "product_image",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    productUnitId: uuid("product_unit_id").references(() => productUnit.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    alt: text("alt"),
    position: smallint("position").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("product_image_product_idx").on(t.productId),
    index("product_image_unit_idx").on(t.productUnitId),
    uniqueIndex("product_image_product_position_unique")
      .on(t.productId, t.position)
      .where(sql`${t.productUnitId} IS NULL`),
    uniqueIndex("product_image_unit_position_unique")
      .on(t.productUnitId, t.position)
      .where(sql`${t.productUnitId} IS NOT NULL`),
    // Ровно одно главное фото на модель.
    uniqueIndex("product_image_single_primary")
      .on(t.productId)
      .where(sql`${t.isPrimary} AND ${t.productUnitId} IS NULL`),
  ],
);

/**
 * Склад. Для `stocked` — источник истины.
 * Для `serialized` — кэш: `quantity` = число экземпляров в статусе `available`;
 * обновляется сервисом инвентаря в той же транзакции, что и смена статуса экземпляра.
 */
export const inventory = pgTable(
  "inventory",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    /** Зарезервировано под неоплаченные заказы. Доступно = quantity - reserved. */
    reserved: integer("reserved").notNull().default(0),
    lowStockThreshold: smallint("low_stock_threshold").notNull().default(1),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("inventory_product_unique").on(t.productId),
    check("inventory_quantity_non_negative", sql`${t.quantity} >= 0`),
    check("inventory_reserved_non_negative", sql`${t.reserved} >= 0`),
    check("inventory_reserved_within_quantity", sql`${t.reserved} <= ${t.quantity}`),
  ],
);
