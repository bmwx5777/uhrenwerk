import "server-only";

import type { PaymentMethod } from "@/lib/constants/payment";
import { bankTransferProvider } from "./providers/bank-transfer";
import type { PaymentProvider } from "./types";

/**
 * Реестр провайдеров: способ оплаты → реализация.
 *
 * Подключение карт и крипты сводится к добавлению здесь одной строки
 * после того, как будут выбраны провайдеры:
 *   card: stripeProvider,
 *   crypto: coinGateProvider,
 *
 * Код провайдера я не пишу «по памяти»: вызовы Stripe и крипто-шлюза
 * будут сделаны по актуальной документации, когда провайдер выбран.
 */
const PROVIDERS: Partial<Record<PaymentMethod, PaymentProvider>> = {
  bank_transfer: bankTransferProvider,
};

export function getPaymentProvider(method: PaymentMethod): PaymentProvider | null {
  return PROVIDERS[method] ?? null;
}

export function listConnectedMethods(): PaymentMethod[] {
  return Object.keys(PROVIDERS) as PaymentMethod[];
}
