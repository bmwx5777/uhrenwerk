import "server-only";

import type { PaymentMethod } from "@/lib/constants/payment";

/**
 * Контракт платёжного провайдера.
 *
 * Весь остальной код (оформление заказа, страница оплаты, админка) знает
 * только этот интерфейс. Подключить Stripe или крипто-шлюз — значит
 * добавить файл в `providers/` и строку в реестр; трогать checkout и
 * заказы при этом не нужно.
 *
 * Сумма в `createCheckout` приходит из заказа, который посчитал сервер.
 * Провайдеру её передаём, но от клиента не принимаем нигде.
 */

export type ProviderId = "manual_bank_transfer" | "card_gateway" | "crypto_gateway";

export type CreateCheckoutInput = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
  email: string;
};

/**
 * Что делать покупателю дальше.
 *
 * `instructions` — показать реквизиты на нашей странице (перевод).
 * `redirect` — отправить на страницу провайдера (карта, крипта).
 */
export type CheckoutSession =
  | {
      kind: "instructions";
      /** Назначение платежа, по которому мы находим деньги. */
      reference: string;
      /** До какого момента держим резерв. */
      dueAt: Date;
    }
  | {
      kind: "redirect";
      redirectUrl: string;
      providerPaymentId: string;
    };

export type PaymentProvider = {
  id: ProviderId;
  method: PaymentMethod;
  /**
   * Создаёт платёж на стороне провайдера (или фиксирует ожидание денег
   * для ручного перевода) и возвращает следующий шаг для покупателя.
   */
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
};
