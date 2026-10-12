import { displayPriceCents, type VatScheme } from "./pricing";

/**
 * Арифметика заказа. Чистые функции без обращений к базе и сети.
 *
 * Эти же вычисления используются и для предварительного расчёта в
 * checkout, и при создании заказа. Одна реализация на оба случая —
 * иначе сумма на экране и сумма в платеже однажды разойдутся.
 *
 * Все величины — целые центы. Правило округления: НДС считается на
 * единицу товара и умножается на количество (см. `lineDisplayCents`),
 * чтобы пять часов по 3 500 € давали ровно 17 500 €.
 */

export type OrderMathLine = {
  netUnitCents: number;
  quantity: number;
  vatScheme: VatScheme;
};

export type ComputedLine = OrderMathLine & {
  taxRateBp: number;
  taxPerUnitCents: number;
  lineNetCents: number;
  lineTaxCents: number;
  lineGrossCents: number;
};

export type OrderTotals = {
  lines: ComputedLine[];
  subtotalNetCents: number;
  shippingNetCents: number;
  shippingTaxCents: number;
  /** НДС по товарам и доставке вместе — как в заказе. */
  taxCents: number;
  discountCents: number;
  totalCents: number;
};

export function taxPerUnit(netUnitCents: number, rateBp: number): number {
  return Math.round((netUnitCents * rateBp) / 10_000);
}

/**
 * Полный расчёт заказа.
 *
 * `taxRateBp` — ставка, определённая по стране доставки. Для товаров по
 * схеме маржи она не применяется: НДС с маржи платит продавец и в счёте
 * его не выделяют.
 */
export function computeOrderTotals(input: {
  lines: OrderMathLine[];
  taxRateBp: number;
  shippingNetCents: number;
  discountCents?: number;
}): OrderTotals {
  const discountCents = input.discountCents ?? 0;

  const lines: ComputedLine[] = input.lines.map((line) => {
    const rateBp = line.vatScheme === "margin" ? 0 : input.taxRateBp;
    const perUnitTax = taxPerUnit(line.netUnitCents, rateBp);

    return {
      ...line,
      taxRateBp: rateBp,
      taxPerUnitCents: perUnitTax,
      lineNetCents: line.netUnitCents * line.quantity,
      lineTaxCents: perUnitTax * line.quantity,
      lineGrossCents: (line.netUnitCents + perUnitTax) * line.quantity,
    };
  });

  const subtotalNetCents = lines.reduce((total, line) => total + line.lineNetCents, 0);
  const linesTaxCents = lines.reduce((total, line) => total + line.lineTaxCents, 0);

  // Доставка облагается по основной ставке заказа: это услуга продавца,
  // а не товар по схеме маржи.
  const shippingTaxCents = taxPerUnit(input.shippingNetCents, input.taxRateBp);
  const taxCents = linesTaxCents + shippingTaxCents;

  return {
    lines,
    subtotalNetCents,
    shippingNetCents: input.shippingNetCents,
    shippingTaxCents,
    taxCents,
    discountCents,
    // Та же формула, что в check-constraint `order_total_matches_parts`:
    // база не даст записать заказ, если расчёт разойдётся.
    totalCents: subtotalNetCents - discountCents + input.shippingNetCents + taxCents,
  };
}

/**
 * Цена позиции так, как она показана в каталоге (по домашней ставке).
 * Нужна, чтобы объяснить покупателю разницу при доставке за пределы ЕС.
 */
export function catalogGrossCents(
  netUnitCents: number,
  quantity: number,
  vatScheme: VatScheme,
): number {
  return displayPriceCents(netUnitCents, vatScheme) * quantity;
}
