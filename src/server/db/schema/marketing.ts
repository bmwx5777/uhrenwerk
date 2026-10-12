import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_shared";
import { newsletterStatusEnum } from "./enums";

/**
 * Подписчик рассылки. Схема double opt-in:
 * `pending` → письмо с `token` → подтверждение → `subscribed`.
 * Так требует GDPR, и так же защищаемся от подписки чужого адреса.
 */
export const newsletterSubscriber = pgTable(
  "newsletter_subscriber",
  {
    id: primaryId(),
    email: text("email").notNull(),
    status: newsletterStatusEnum("status").notNull().default("pending"),
    /** Одноразовый токен подтверждения и отписки. */
    token: text("token").notNull(),
    /** Откуда пришла подписка: footer, checkout, popup. */
    source: text("source"),
    locale: char("locale", { length: 2 }).notNull().default("ru"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("newsletter_email_unique").on(t.email),
    uniqueIndex("newsletter_token_unique").on(t.token),
    index("newsletter_status_idx").on(t.status),
    check("newsletter_email_lowercase", sql`${t.email} = lower(${t.email})`),
  ],
);
