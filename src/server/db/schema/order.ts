import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
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
import {
  orderStatusEnum,
  taxTreatmentEnum,
  unitConditionGradeEnum,
  vatSchemeEnum,
} from "./enums";
import { shippingMethod } from "./shipping";

/** Снимок адреса на момент заказа — заказ остаётся корректным документом навсегда. */
export type OrderAddressSnapshot = {
  recipientName: string;
  phone?: string;
  companyName?: string;
  vatNumber?: string;
  countryCode: string;
  state?: string;
  city: string;
  postalCode: string;
  line1: string;
  line2?: string;
};

/**
 * Заказ. Все денежные поля считает сервер; ни одно не приходит от клиента.
 *
 * Денежная модель (всё в центах, НЕТТО + налог отдельно):
 *   subtotalCents  — сумма позиций без НДС
 *   discountCents  — скидка без НДС
 *   shippingCents  — доставка без НДС
 *   taxCents       — НДС со всей базы
 *   totalCents     — итог к оплате (проверяется check-constraint'ом)
 */
export const order = pgTable(
  "order",
  {
    id: primaryId(),
    /** Человекочитаемый номер, например UW-2026-000123. */
    orderNumber: text("order_number").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Email на момент заказа (гость может оформить без регистрации). */
    email: text("email").notNull(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),

    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),

    taxTreatment: taxTreatmentEnum("tax_treatment").notNull(),
    /** Применённая ставка НДС в базисных пунктах (0 для экспорта и reverse charge). */
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    vatNumber: text("vat_number"),
    vatValidatedAt: timestamp("vat_validated_at", { withTimezone: true }),

    shippingAddress: jsonb("shipping_address").$type<OrderAddressSnapshot>().notNull(),
    billingAddress: jsonb("billing_address").$type<OrderAddressSnapshot>(),
    shippingMethodId: uuid("shipping_method_id").references(() => shippingMethod.id, {
      onDelete: "set null",
    }),
    shippingMethodName: text("shipping_method_name").notNull(),

    customerNote: text("customer_note"),
    adminNote: text("admin_note"),

    invoiceNumber: text("invoice_number"),
    invoiceIssuedAt: timestamp("invoice_issued_at", { withTimezone: true }),

    /** До этого момента товар зарезервирован под неоплаченный заказ. */
    reservationExpiresAt: timestamp("reservation_expires_at", {
      withTimezone: true,
    }),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("order_number_unique").on(t.orderNumber),
    uniqueIndex("order_invoice_number_unique")
      .on(t.invoiceNumber)
      .where(sql`${t.invoiceNumber} IS NOT NULL`),
    index("order_user_idx").on(t.userId),
    index("order_email_idx").on(t.email),
    index("order_status_idx").on(t.status),
    index("order_placed_at_idx").on(t.placedAt.desc()),
    // Для джоба, снимающего резерв с просроченных заказов.
    index("order_reservation_idx")
      .on(t.reservationExpiresAt)
      .where(sql`${t.status} = 'pending_payment'`),
    check("order_subtotal_non_negative", sql`${t.subtotalCents} >= 0`),
    check("order_discount_non_negative", sql`${t.discountCents} >= 0`),
    check("order_shipping_non_negative", sql`${t.shippingCents} >= 0`),
    check("order_tax_non_negative", sql`${t.taxCents} >= 0`),
    check("order_total_positive", sql`${t.totalCents} > 0`),
    // Арифметика заказа гарантируется базой, а не только кодом.
    check(
      "order_total_matches_parts",
      sql`${t.totalCents} = ${t.subtotalCents} - ${t.discountCents} + ${t.shippingCents} + ${t.taxCents}`,
    ),
    check(
      "order_discount_within_subtotal",
      sql`${t.discountCents} <= ${t.subtotalCents}`,
    ),
  ],
);

/**
 * Позиция заказа. Содержит СНИМКИ названия, бренда и цены:
 * переименование или архивация товара не искажает прошлые заказы.
 */
export const orderItem = pgTable(
  "order_item",
  {
    id: primaryId(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => product.id, {
      onDelete: "set null",
    }),
    productUnitId: uuid("product_unit_id").references(() => productUnit.id, {
      onDelete: "set null",
    }),

    productName: text("product_name").notNull(),
    brandName: text("brand_name").notNull(),
    sku: text("sku").notNull(),
    reference: text("reference"),
    serialNumber: text("serial_number"),
    conditionGrade: unitConditionGradeEnum("condition_grade"),
    imageUrl: text("image_url"),
    vatScheme: vatSchemeEnum("vat_scheme").notNull().default("standard"),

    /** Цена за единицу без НДС на момент заказа — прочитана из БД сервером. */
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: smallint("quantity").notNull(),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("order_item_order_idx").on(t.orderId),
    index("order_item_product_idx").on(t.productId),
    index("order_item_unit_idx").on(t.productUnitId),
    check("order_item_quantity_positive", sql`${t.quantity} > 0`),
    check("order_item_unit_price_positive", sql`${t.unitPriceCents} > 0`),
    check("order_item_tax_non_negative", sql`${t.taxCents} >= 0`),
    check(
      "order_item_line_total_matches",
      sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`,
    ),
    check(
      "order_item_unit_quantity_one",
      sql`${t.productUnitId} IS NULL OR ${t.quantity} = 1`,
    ),
  ],
);
