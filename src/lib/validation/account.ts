import { z } from "zod";

import { countryCodeField, phoneField } from "./common";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100),
  phone: phoneField.optional(),
});

/**
 * Адрес доставки или оплаты.
 *
 * VAT-номер нужен для B2B-покупателей из ЕС: при валидном номере
 * применяется reverse charge и НДС не начисляется (проверка номера
 * через VIES — на этапе 7, вместе с расчётом налога).
 */
export const addressSchema = z.object({
  type: z.enum(["shipping", "billing"]).catch("shipping"),
  recipientName: z.string().trim().min(2, "Укажите получателя").max(120),
  phone: phoneField.optional(),
  companyName: z.string().trim().max(160).optional(),
  vatNumber: z.string().trim().max(32).optional(),
  countryCode: countryCodeField,
  state: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1, "Укажите город").max(120),
  postalCode: z.string().trim().min(1, "Укажите индекс").max(32),
  line1: z.string().trim().min(1, "Укажите улицу и дом").max(200),
  line2: z.string().trim().max(200).optional(),
  isDefault: z.coerce.boolean().catch(false),
});

export const addressIdSchema = z.uuid("Некорректный адрес");

export type AddressInput = z.infer<typeof addressSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
