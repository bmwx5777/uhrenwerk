import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { user } from "./auth";
import { product, productUnit } from "./catalog";
import { cartStatusEnum } from "./enums";

/**
 * Корзина живёт на сервере — и для гостя (по cookie-токену), и для пользователя.
 * При входе гостевая корзина сливается с пользовательской (этап 6).
 *
 * Важно: в корзине НЕ хранится цена для расчётов. Цена читается из БД
 * в момент отображения и заново — в момент создания заказа.
 */
export const cart = pgTable(
  "cart",
  {
    id: primaryId(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    /** Непредсказуемый токен из httpOnly-cookie для гостевой корзины. */
    guestToken: text("guest_token"),
    status: cartStatusEnum("status").notNull().default("active"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // Одна активная корзина на пользователя.
    uniqueIndex("cart_active_user_unique")
      .on(t.userId)
      .where(sql`${t.status} = 'active' AND ${t.userId} IS NOT NULL`),
    uniqueIndex("cart_guest_token_unique")
      .on(t.guestToken)
      .where(sql`${t.guestToken} IS NOT NULL`),
    index("cart_status_expires_idx").on(t.status, t.expiresAt),
    check(
      "cart_owner_present",
      sql`${t.userId} IS NOT NULL OR ${t.guestToken} IS NOT NULL`,
    ),
  ],
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: primaryId(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    /** Для уникальных экземпляров: конкретные часы, которые выбрал покупатель. */
    productUnitId: uuid("product_unit_id").references(() => productUnit.id, {
      onDelete: "cascade",
    }),
    quantity: smallint("quantity").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    index("cart_item_cart_idx").on(t.cartId),
    index("cart_item_product_idx").on(t.productId),
    uniqueIndex("cart_item_product_unique")
      .on(t.cartId, t.productId)
      .where(sql`${t.productUnitId} IS NULL`),
    uniqueIndex("cart_item_unit_unique")
      .on(t.cartId, t.productUnitId)
      .where(sql`${t.productUnitId} IS NOT NULL`),
    check("cart_item_quantity_positive", sql`${t.quantity} > 0`),
    // Уникальный экземпляр нельзя положить в количестве больше одного.
    check(
      "cart_item_unit_quantity_one",
      sql`${t.productUnitId} IS NULL OR ${t.quantity} = 1`,
    ),
  ],
);
