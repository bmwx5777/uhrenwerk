import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";

/** Зона доставки: ЕС, Европа вне ЕС, Северная Америка, Азия, остальной мир. */
export const shippingZone = pgTable(
  "shipping_zone",
  {
    id: primaryId(),
    name: text("name").notNull(),
    position: smallint("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("shipping_zone_name_unique").on(t.name)],
);

/**
 * Страны зоны. Нормализованная связь вместо массива кодов:
 * `unique(countryCode)` гарантирует, что страна не попадёт в две зоны
 * и расчёт доставки всегда однозначен.
 */
export const shippingZoneCountry = pgTable(
  "shipping_zone_country",
  {
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZone.id, { onDelete: "cascade" }),
    countryCode: char("country_code", { length: 2 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.zoneId, t.countryCode] }),
    uniqueIndex("shipping_zone_country_unique").on(t.countryCode),
    check(
      "shipping_zone_country_upper",
      sql`${t.countryCode} = upper(${t.countryCode})`,
    ),
  ],
);

/** Способ доставки внутри зоны. Цена — НЕТТО в центах, НДС начисляется сверху. */
export const shippingMethod = pgTable(
  "shipping_method",
  {
    id: primaryId(),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => shippingZone.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    /** Бесплатно при сумме заказа выше порога (NULL — всегда платно). */
    freeOverCents: integer("free_over_cents"),
    minDays: smallint("min_days").notNull(),
    maxDays: smallint("max_days").notNull(),
    isInsured: boolean("is_insured").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    position: smallint("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("shipping_method_zone_idx").on(t.zoneId),
    uniqueIndex("shipping_method_zone_name_unique").on(t.zoneId, t.name),
    check("shipping_method_price_non_negative", sql`${t.priceCents} >= 0`),
    check("shipping_method_days_order", sql`${t.minDays} <= ${t.maxDays}`),
    check(
      "shipping_method_free_over_positive",
      sql`${t.freeOverCents} IS NULL OR ${t.freeOverCents} > 0`,
    ),
  ],
);
