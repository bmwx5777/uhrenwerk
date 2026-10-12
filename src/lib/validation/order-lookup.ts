import { z } from "zod";

import { emailField } from "./common";

/**
 * Поиск заказа гостем.
 *
 * Нужны и номер, и email: номер заказа последователен (UW-2026-000123),
 * поэтому сам по себе он не должен открывать чужой заказ.
 */
export const orderLookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.string().regex(/^UW-\d{4}-\d{6}$/, "Номер вида UW-2026-000123")),
  email: emailField,
});
