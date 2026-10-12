import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

import { timestamps } from "./_shared";

/**
 * Ставки НДС по странам. Ставка в базисных пунктах: 1900 = 19,00 %.
 * Целое число, чтобы в расчётах не было ни одного float.
 *
 * Логика применения (сервис налогов, этап 7):
 *   страна вне ЕС                → export_zero_rated, 0 %
 *   ЕС + валидный VAT (не CY)    → eu_reverse_charge, 0 %
 *   CY                           → eu_domestic, ставка CY
 *   другая страна ЕС             → eu_oss, ставка страны доставки
 *   товар по схеме маржи         → margin_scheme, НДС в инвойсе не выделяется
 */
export const taxRate = pgTable(
  "tax_rate",
  {
    countryCode: char("country_code", { length: 2 }).primaryKey(),
    countryName: text("country_name").notNull(),
    isEu: boolean("is_eu").notNull().default(false),
    standardRateBp: integer("standard_rate_bp").notNull(),
    validFrom: date("valid_from").notNull(),
    ...timestamps,
  },
  (t) => [
    index("tax_rate_is_eu_idx").on(t.isEu),
    check(
      "tax_rate_bp_range",
      sql`${t.standardRateBp} >= 0 AND ${t.standardRateBp} <= 10000`,
    ),
    check("tax_rate_country_upper", sql`${t.countryCode} = upper(${t.countryCode})`),
  ],
);
