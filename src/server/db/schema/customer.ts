import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { user } from "./auth";
import { product, productUnit } from "./catalog";
import { addressTypeEnum } from "./enums";

/**
 * Адрес в адресной книге пользователя.
 * В заказ адрес попадает снимком (jsonb) — правка адреса не меняет прошлые заказы.
 */
export const address = pgTable(
  "address",
  {
    id: primaryId(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: addressTypeEnum("type").notNull().default("shipping"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone"),
    companyName: text("company_name"),
    /** VAT-номер для B2B: при валидном номере из ЕС применяется reverse charge. */
    vatNumber: text("vat_number"),
    vatValidatedAt: timestamp("vat_validated_at", { withTimezone: true }),
    countryCode: char("country_code", { length: 2 }).notNull(),
    state: text("state"),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("address_user_idx").on(t.userId),
    index("address_user_type_idx").on(t.userId, t.type),
    // Не больше одного адреса по умолчанию на каждый тип у пользователя.
    uniqueIndex("address_single_default_per_type")
      .on(t.userId, t.type)
      .where(sql`${t.isDefault}`),
    check(
      "address_country_code_format",
      sql`${t.countryCode} = upper(${t.countryCode})`,
    ),
  ],
);

/** Один список желаний на пользователя. */
export const wishlist = pgTable(
  "wishlist",
  {
    id: primaryId(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("wishlist_user_unique").on(t.userId)],
);

export const wishlistItem = pgTable(
  "wishlist_item",
  {
    id: primaryId(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlist.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    /** Заполняется, если в избранное добавлен конкретный уникальный экземпляр. */
    productUnitId: uuid("product_unit_id").references(() => productUnit.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("wishlist_item_wishlist_idx").on(t.wishlistId),
    index("wishlist_item_product_idx").on(t.productId),
    uniqueIndex("wishlist_item_product_unique")
      .on(t.wishlistId, t.productId)
      .where(sql`${t.productUnitId} IS NULL`),
    uniqueIndex("wishlist_item_unit_unique")
      .on(t.wishlistId, t.productUnitId)
      .where(sql`${t.productUnitId} IS NOT NULL`),
  ],
);
