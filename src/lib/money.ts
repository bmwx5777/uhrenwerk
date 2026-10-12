/**
 * Деньги в проекте — всегда целые центы (`integer`).
 * Никаких float-операций: 0.1 + 0.2 !== 0.3, а в чеке это недопустимо.
 */

export const DEFAULT_CURRENCY = "EUR";
export const DEFAULT_LOCALE = "ru-RU";

/** НДС от суммы нетто. Ставка в базисных пунктах: 1900 = 19 %. */
export function taxFromNet(netCents: number, rateBp: number): number {
  return Math.round((netCents * rateBp) / 10_000);
}

/** Сумма брутто = нетто + НДС. */
export function grossFromNet(netCents: number, rateBp: number): number {
  return netCents + taxFromNet(netCents, rateBp);
}

/** Обратный пересчёт: вычленить нетто из цены с НДС. */
export function netFromGross(grossCents: number, rateBp: number): number {
  return Math.round((grossCents * 10_000) / (10_000 + rateBp));
}

/** Форматирование для вывода: 940000 → «9 400 €». */
export function formatMoney(
  cents: number,
  options: { currency?: string; locale?: string } = {},
): string {
  const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = options;
  const hasFraction = cents % 100 !== 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}

/** Ставка в базисных пунктах → читаемый процент: 1900 → «19 %». */
export function formatTaxRate(rateBp: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(rateBp / 10_000);
}
