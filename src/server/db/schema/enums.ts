import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);

export const addressTypeEnum = pgEnum("address_type", ["shipping", "billing"]);

/** `stocked` — обычный товарный запас; `serialized` — уникальный экземпляр с серийным номером. */
export const productKindEnum = pgEnum("product_kind", ["stocked", "serialized"]);

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "archived",
]);

export const productConditionEnum = pgEnum("product_condition", [
  "new",
  "unworn",
  "pre_owned",
]);

/**
 * Режим НДС. `margin` — схема налогообложения маржи для б/у товаров,
 * купленных у частных лиц: НДС платится только с маржи и НЕ выделяется в инвойсе.
 */
export const vatSchemeEnum = pgEnum("vat_scheme", ["standard", "margin"]);

export const unitConditionGradeEnum = pgEnum("unit_condition_grade", [
  "unworn",
  "excellent",
  "very_good",
  "good",
  "fair",
]);

export const unitStatusEnum = pgEnum("unit_status", [
  "available",
  "reserved",
  "sold",
  "withdrawn",
]);

export const cartStatusEnum = pgEnum("cart_status", [
  "active",
  "converted",
  "abandoned",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "partially_refunded",
]);

/** Налоговый режим конкретного заказа — вычисляется сервером по стране доставки. */
export const taxTreatmentEnum = pgEnum("tax_treatment", [
  "eu_domestic",
  "eu_oss",
  "eu_reverse_charge",
  "export_zero_rated",
  "margin_scheme",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "bank_transfer",
  "crypto",
]);

/** Новый провайдер добавляется через `ALTER TYPE ... ADD VALUE` (миграция в одну строку). */
export const paymentProviderEnum = pgEnum("payment_provider", [
  "manual_bank_transfer",
  "card_gateway",
  "crypto_gateway",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "requires_action",
  "succeeded",
  "failed",
  "cancelled",
  "expired",
  "refunded",
  "partially_refunded",
]);

export const newsletterStatusEnum = pgEnum("newsletter_status", [
  "pending",
  "subscribed",
  "unsubscribed",
]);
