/** Способы оплаты и их правила. */

export type PaymentMethod = "bank_transfer" | "card" | "crypto";

/**
 * Карта — удобно, но дорого и рискованно на большом чеке: комиссия
 * 1,5–3 % и чарджбэк «товар не получен». Выше этой суммы предлагаем
 * только перевод и крипту — стандартная практика люксового ритейла.
 */
export const CARD_LIMIT_CENTS = 500_000;

/**
 * Срок резерва зависит от способа оплаты: карта и крипта проходят за
 * минуты, банковский перевод идёт дни. Один общий срок либо держал бы
 * товар неделю из-за брошенной карты, либо отменял бы оплаченный
 * переводом заказ.
 */
export const RESERVATION_MINUTES_BY_METHOD: Record<PaymentMethod, number> = {
  card: 30,
  crypto: 20,
  bank_transfer: 60 * 24 * 7,
};

export type PaymentMethodMeta = {
  method: PaymentMethod;
  label: string;
  description: string;
  /** Подключён ли способ. Карты и крипта ждут выбора провайдера. */
  available: boolean;
  unavailableReason?: string;
};

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    method: "bank_transfer",
    label: "Банковский перевод",
    description:
      "Пришлём счёт с реквизитами и номером для назначения платежа. Для заказов от 5 000 € это основной способ: без комиссий и без риска отмены платежа.",
    available: true,
  },
  {
    method: "card",
    label: "Карта Visa / Mastercard",
    description: "Оплата картой онлайн с подтверждением 3-D Secure.",
    available: false,
    unavailableReason:
      "Подключается после выбора платёжного провайдера (Stripe или Checkout.com).",
  },
  {
    method: "crypto",
    label: "Криптовалюта",
    description: "BTC, ETH, USDT (TRC-20) и USDC с фиксацией курса на 15 минут.",
    available: false,
    unavailableReason:
      "Подключается после выбора крипто-шлюза (CoinGate или NOWPayments).",
  },
];

export function isMethodAvailable(method: PaymentMethod): boolean {
  return PAYMENT_METHODS.some((item) => item.method === method && item.available);
}

/** Карта недоступна выше лимита — показываем это сразу, а не после отказа. */
export function methodAllowedForAmount(
  method: PaymentMethod,
  totalCents: number,
): boolean {
  if (method === "card" && totalCents > CARD_LIMIT_CENTS) return false;
  return true;
}
