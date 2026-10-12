import { z } from "zod";

import { addressSchema } from "./account";
import { countryCodeField, emailField } from "./common";

/**
 * Схемы оформления заказа.
 *
 * Обратите внимание, чего здесь НЕТ: ни цены, ни суммы, ни итога.
 * Клиенту просто некуда их передать — сервер читает цены из базы сам.
 * Это и есть требование «цена никогда не принимается от клиента»,
 * выраженное в типах.
 */

/** Запрос предварительного расчёта при смене страны или доставки. */
export const quoteRequestSchema = z.object({
  countryCode: countryCodeField,
  vatNumber: z.string().trim().max(32).optional(),
  shippingMethodId: z.uuid().optional(),
});

/** Адрес, введённый прямо в checkout (гость или новый адрес у клиента). */
export const checkoutAddressSchema = addressSchema.omit({
  type: true,
  isDefault: true,
});

export const placeOrderSchema = z
  .object({
    /** Сохранённый адрес из адресной книги. */
    addressId: z.uuid().optional(),
    /** Или новый адрес, введённый в форме. */
    address: checkoutAddressSchema.optional(),
    /** Email обязателен для гостя; у вошедшего берётся из аккаунта. */
    email: emailField.optional(),
    shippingMethodId: z.uuid("Выберите способ доставки"),
    customerNote: z.string().trim().max(500).optional(),
    /** Явное согласие с условиями продажи и политикой возврата. */
    acceptTerms: z.literal(true, "Подтвердите согласие с условиями"),
    /** Сохранить введённый адрес в адресную книгу (для вошедших). */
    saveAddress: z.coerce.boolean().catch(false),
  })
  .refine((value) => Boolean(value.addressId) || Boolean(value.address), {
    message: "Укажите адрес доставки",
    path: ["address"],
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;
