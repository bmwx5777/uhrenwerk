import { DISPLAY_VAT_RATE_BP, HOME_VAT_RATE_BP } from "./constants/tax";
import { formatMoney, grossFromNet, netFromGross } from "./money";

/**
 * Режим НДС товара. Дублирует значения `vat_scheme` из базы, но живёт в `lib`:
 * клиентским компонентам не нужно тянуть серверную схему ради двух строк.
 */
export type VatScheme = "standard" | "margin";

/**
 * Цена для показа на витрине.
 *
 * `standard` — к цене нетто добавляется НДС.
 * `margin`   — товар по схеме налогообложения маржи (обычно pre-owned,
 *              купленный у частного лица): НДС в счёте не выделяется,
 *              сохранённая цена уже является конечной.
 */
export function displayPriceCents(netCents: number, vatScheme: VatScheme): number {
  return vatScheme === "margin"
    ? netCents
    : grossFromNet(netCents, DISPLAY_VAT_RATE_BP);
}

/**
 * Стоимость позиции на витрине: цена с НДС за единицу, умноженная
 * на количество.
 *
 * Порядок операций важен. Цены назначаются круглыми в терминах витрины
 * (3 500 € за штуку), поэтому пять штук должны давать ровно 17 500 €.
 * Если считать НДС от суммы нетто позиции, получится 17 500,02 € —
 * копеечное расхождение, из-за которого сумма строк не сходится с итогом.
 *
 * Эта же функция используется и в строке корзины, и в подсчёте итога —
 * чтобы правило было одно.
 */
export function lineDisplayCents(
  netUnitCents: number,
  quantity: number,
  vatScheme: VatScheme,
): number {
  return displayPriceCents(netUnitCents, vatScheme) * quantity;
}

/** Обратное преобразование: из цены витрины в нетто (для фильтров по цене). */
export function netPriceCentsFromDisplay(displayCents: number): number {
  return netFromGross(displayCents, DISPLAY_VAT_RATE_BP);
}

/** Готовая строка цены: 714952 → «7 150 €». */
export function formatDisplayPrice(netCents: number, vatScheme: VatScheme): string {
  return formatMoney(displayPriceCents(netCents, vatScheme));
}

/** Скидка в процентах для зачёркнутой цены; null, если скидки нет. */
export function discountPercent(
  netCents: number,
  compareAtNetCents: number | null,
): number | null {
  if (!compareAtNetCents || compareAtNetCents <= netCents) return null;
  return Math.round((1 - netCents / compareAtNetCents) * 100);
}

/**
 * Розничная цена с НДС → цена нетто для базы.
 *
 * Мерчандайзер думает в терминах цены на витрине («9 400 €»), а в базе
 * хранится нетто: налог начисляется по стране доставки.
 *
 * Тонкость, о которой нужно знать: при хранении нетто и целых центах не
 * каждая круглая сумма с НДС достижима — около 15 % значений
 * пропускаются при округлении (например, 5 100 € при ставке 19 %
 * получить невозможно). Поэтому функция возвращает и фактическую цену
 * витрины: интерфейс показывает её сразу, чтобы цена не «уехала» на
 * копейку незаметно.
 */
export function netCentsFromGrossEur(grossEur: number): {
  netCents: number;
  actualGrossCents: number;
  isExact: boolean;
} {
  const targetGross = Math.round(grossEur * 100);
  const estimate = Math.round((targetGross * 10_000) / (10_000 + HOME_VAT_RATE_BP));

  for (const candidate of [
    estimate,
    estimate + 1,
    estimate - 1,
    estimate + 2,
    estimate - 2,
  ]) {
    if (grossFromNet(candidate, HOME_VAT_RATE_BP) === targetGross) {
      return { netCents: candidate, actualGrossCents: targetGross, isExact: true };
    }
  }

  return {
    netCents: estimate,
    actualGrossCents: grossFromNet(estimate, HOME_VAT_RATE_BP),
    isExact: false,
  };
}

/** Цена нетто → розничная цена в евро для поля ввода в админке. */
export function grossEurFromNetCents(
  netCents: number,
  vatScheme: VatScheme = "standard",
): number {
  return displayPriceCents(netCents, vatScheme) / 100;
}
