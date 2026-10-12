import "server-only";

import { RESERVATION_MINUTES_BY_METHOD } from "@/lib/constants/payment";
import type { CheckoutSession, CreateCheckoutInput, PaymentProvider } from "../types";

/**
 * Банковский перевод с ручным подтверждением.
 *
 * Внешнего API здесь нет — и это сознательно. Покупатель переводит деньги
 * по реквизитам, администратор видит поступление в банке и подтверждает
 * оплату в админке. Для заказов на тысячи евро это основной способ:
 * нулевая комиссия и отсутствие чарджбэков перевешивают неудобство.
 *
 * Автоматическую сверку (virtual IBAN или open banking) можно добавить
 * позже: поле `providerReference` уже хранит назначение платежа, по
 * которому платёж сопоставляется с заказом.
 */
export const bankTransferProvider: PaymentProvider = {
  id: "manual_bank_transfer",
  method: "bank_transfer",

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    // Назначение платежа — номер заказа. Он уникален и человекочитаем,
    // поэтому банковская выписка сразу сходится с заказом.
    const reference = input.orderNumber;

    const dueAt = new Date(
      Date.now() + RESERVATION_MINUTES_BY_METHOD.bank_transfer * 60 * 1000,
    );

    return { kind: "instructions", reference, dueAt };
  },
};
