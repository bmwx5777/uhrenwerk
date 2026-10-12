import "server-only";

import { computeOrderTotals, taxPerUnit, type OrderTotals } from "@/lib/order-math";
import { getCartSummary, type CartLine } from "./cart";
import {
  getShippingOption,
  listShippingOptions,
  shippingCostCents,
  type ShippingOption,
} from "./shipping";
import { resolveTaxTreatment, type TaxResolution } from "./tax";

/**
 * Предварительный расчёт заказа.
 *
 * Клиент присылает только страну, VAT-номер и выбранный способ доставки.
 * Цены, ставка налога и итог считаются здесь — поэтому числа на экране
 * покупателя и сумма, которая уйдёт в платёж, приходят из одного места.
 */

export type QuoteLine = CartLine & {
  taxRateBp: number;
  lineNetCents: number;
  lineTaxCents: number;
  lineGrossCents: number;
};

/**
 * Способ доставки с итоговой ценой для показа.
 *
 * Цену с налогом считает сервер для каждого варианта — чтобы клиенту
 * не приходилось ничего умножать самому.
 */
export type ShippingChoice = ShippingOption & {
  /** Цена с учётом порога бесплатной доставки и налога заказа. */
  displayCents: number;
  isFree: boolean;
};

export type CheckoutQuote = {
  isEmpty: boolean;
  hasUnavailableLines: boolean;
  lines: QuoteLine[];
  totals: OrderTotals;
  tax: TaxResolution;
  shippingOptions: ShippingChoice[];
  selectedShippingId: string | null;
};

export async function buildCheckoutQuote(input: {
  countryCode: string;
  vatNumber?: string | null;
  shippingMethodId?: string | null;
}): Promise<CheckoutQuote> {
  const [cart, tax, shippingOptions] = await Promise.all([
    getCartSummary(),
    resolveTaxTreatment({
      countryCode: input.countryCode,
      vatNumber: input.vatNumber ?? null,
    }),
    listShippingOptions(input.countryCode),
  ]);

  const selectedShipping = input.shippingMethodId
    ? await getShippingOption(input.shippingMethodId, input.countryCode)
    : (shippingOptions[0] ?? null);

  const subtotalNetCents = cart.lines.reduce(
    (total, line) => total + line.unitPriceCents * line.quantity,
    0,
  );

  const shippingNetCents = selectedShipping
    ? shippingCostCents(selectedShipping, subtotalNetCents)
    : 0;

  const totals = computeOrderTotals({
    lines: cart.lines.map((line) => ({
      netUnitCents: line.unitPriceCents,
      quantity: line.quantity,
      vatScheme: line.vatScheme,
    })),
    taxRateBp: tax.rateBp,
    shippingNetCents,
  });

  const lines: QuoteLine[] = cart.lines.map((line, index) => {
    const computed = totals.lines[index]!;
    return {
      ...line,
      taxRateBp: computed.taxRateBp,
      lineNetCents: computed.lineNetCents,
      lineTaxCents: computed.lineTaxCents,
      lineGrossCents: computed.lineGrossCents,
    };
  });

  const choices: ShippingChoice[] = shippingOptions.map((option) => {
    const net = shippingCostCents(option, subtotalNetCents);

    return {
      ...option,
      displayCents: net + taxPerUnit(net, tax.rateBp),
      isFree: net === 0 && option.priceCents > 0,
    };
  });

  return {
    isEmpty: cart.lines.length === 0,
    hasUnavailableLines: cart.hasUnavailableLines,
    lines,
    totals,
    tax,
    shippingOptions: choices,
    selectedShippingId: selectedShipping?.id ?? null,
  };
}
