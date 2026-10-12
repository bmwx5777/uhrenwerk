import { sql } from "drizzle-orm";
import { customType, timestamp, uuid } from "drizzle-orm/pg-core";

/** PK всех доменных таблиц. UUID генерирует Postgres (`gen_random_uuid()`, PG13+). */
export const primaryId = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);

/** `created_at` / `updated_at` с автообновлением на уровне ORM. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Деньги: только целые минорные единицы (центы), `integer`.
 * Максимум ≈ 21 474 836 € — с запасом для часов любой цены.
 * Никогда не используем float/double для денег.
 */
export const MONEY_MAX_CENTS = 2_000_000_00;

/** Postgres `tsvector` — для полнотекстового поиска по каталогу. */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});
