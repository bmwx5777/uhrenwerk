import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { paymentMethodEnum, paymentProviderEnum, paymentStatusEnum } from "./enums";
import { order } from "./order";

/**
 * Платёж. У заказа может быть несколько попыток оплаты (отказ карты → крипта),
 * поэтому это 1:N к заказу, а не поле в заказе.
 *
 * `amountCents` берётся из `order.totalCents`, посчитанного сервером, —
 * никогда из запроса клиента.
 */
export const payment = pgTable(
  "payment",
  {
    id: primaryId(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    /** Идентификатор платежа на стороне провайдера (intent / invoice id). */
    providerPaymentId: text("provider_payment_id"),
    /** Референс для сверки: код в назначении банковского платежа, адрес инвойса. */
    providerReference: text("provider_reference"),
    status: paymentStatusEnum("status").notNull().default("pending"),

    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    refundedAmountCents: integer("refunded_amount_cents").notNull().default(0),

    /** Крипто-платежи: актив, сеть, сумма и адрес приёма. */
    cryptoAsset: text("crypto_asset"),
    cryptoNetwork: text("crypto_network"),
    cryptoAmount: numeric("crypto_amount", { precision: 38, scale: 18 }),
    cryptoAddress: text("crypto_address"),
    /** Курс фиксируется на короткий срок — после истечения требуется новый расчёт. */
    rateLockedAt: timestamp("rate_locked_at", { withTimezone: true }),
    quoteExpiresAt: timestamp("quote_expires_at", { withTimezone: true }),

    /** Защита от двойного списания при повторной отправке формы. */
    idempotencyKey: text("idempotency_key").notNull(),
    failureReason: text("failure_reason"),
    /** Сырой ответ провайдера — для разбора спорных ситуаций. */
    rawPayload: jsonb("raw_payload"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payment_idempotency_key_unique").on(t.idempotencyKey),
    uniqueIndex("payment_provider_payment_unique")
      .on(t.provider, t.providerPaymentId)
      .where(sql`${t.providerPaymentId} IS NOT NULL`),
    index("payment_order_idx").on(t.orderId),
    index("payment_status_idx").on(t.status),
    index("payment_quote_expires_idx")
      .on(t.quoteExpiresAt)
      .where(sql`${t.status} = 'pending'`),
    check("payment_amount_positive", sql`${t.amountCents} > 0`),
    check(
      "payment_refund_within_amount",
      sql`${t.refundedAmountCents} >= 0 AND ${t.refundedAmountCents} <= ${t.amountCents}`,
    ),
    // У крипто-платежа актив и сеть обязательны, у остальных способов — нет.
    check(
      "payment_crypto_fields_consistent",
      sql`(${t.method} <> 'crypto') OR (${t.cryptoAsset} IS NOT NULL AND ${t.cryptoNetwork} IS NOT NULL)`,
    ),
  ],
);

/**
 * Журнал вебхуков. `unique(provider, eventId)` — единственная защита от
 * повторной обработки: провайдеры ретраят доставку, и без этого можно
 * дважды списать склад или дважды отправить письмо.
 */
export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: primaryId(),
    provider: paymentProviderEnum("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => [
    uniqueIndex("webhook_event_provider_event_unique").on(t.provider, t.eventId),
    index("webhook_event_unprocessed_idx")
      .on(t.receivedAt)
      .where(sql`${t.processedAt} IS NULL`),
  ],
);
