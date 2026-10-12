import { describe, expect, it } from "vitest";

import {
  CARD_LIMIT_CENTS,
  isMethodAvailable,
  methodAllowedForAmount,
} from "./constants/payment";
import { computeOrderTotals, taxPerUnit } from "./order-math";
import {
  displayPriceCents,
  grossEurFromNetCents,
  lineDisplayCents,
  netCentsFromGrossEur,
  netPriceCentsFromDisplay,
} from "./pricing";

describe("НДС на единицу товара", () => {
  it("считает 19 % и округляет до цента", () => {
    expect(taxPerUnit(294118, 1900)).toBe(55882);
    expect(taxPerUnit(0, 1900)).toBe(0);
  });

  it("при нулевой ставке налога нет", () => {
    expect(taxPerUnit(294118, 0)).toBe(0);
  });
});

describe("цена на витрине", () => {
  it("добавляет НДС к обычному товару", () => {
    // 294 118 центов нетто + 19 % = 350 000, то есть ровно 3 500 €
    expect(displayPriceCents(294118, "standard")).toBe(350000);
  });

  it("не трогает цену товара по схеме маржи", () => {
    // НДС с маржи платит продавец и в счёте его не выделяют,
    // поэтому сохранённая цена уже конечная.
    expect(displayPriceCents(1150000, "margin")).toBe(1150000);
  });

  it("умножает цену с НДС на количество, а не наоборот", () => {
    // Если считать НДС от суммы позиции, получится 1 750 002 —
    // расхождение в 2 цента между строкой и итогом.
    expect(lineDisplayCents(294118, 5, "standard")).toBe(1750000);
  });

  it("обратное преобразование возвращает исходное нетто", () => {
    expect(netPriceCentsFromDisplay(350000)).toBe(294118);
  });
});

describe("розничная цена → нетто", () => {
  it("подбирает нетто, дающее ровно заданную цену", () => {
    const result = netCentsFromGrossEur(3500);
    expect(result.isExact).toBe(true);
    expect(result.netCents).toBe(294118);
    expect(displayPriceCents(result.netCents, "standard")).toBe(350000);
  });

  it("честно сообщает о непредставимой сумме", () => {
    // При хранении нетто и целых центах около 15 % круглых сумм
    // недостижимы: 5 100 € при ставке 19 % — одна из них.
    const result = netCentsFromGrossEur(5100);
    expect(result.isExact).toBe(false);
    expect(result.actualGrossCents).not.toBe(510000);
  });

  it("возвращает цену для поля ввода в админке", () => {
    expect(grossEurFromNetCents(294118, "standard")).toBe(3500);
    expect(grossEurFromNetCents(1150000, "margin")).toBe(11500);
  });
});

describe("итоги заказа", () => {
  const twoWatches = [
    { netUnitCents: 294118, quantity: 2, vatScheme: "standard" as const },
  ];

  it("итог сходится с формулой из check-constraint базы", () => {
    const totals = computeOrderTotals({
      lines: twoWatches,
      taxRateBp: 1900,
      shippingNetCents: 2500,
    });

    expect(totals.totalCents).toBe(
      totals.subtotalNetCents -
        totals.discountCents +
        totals.shippingNetCents +
        totals.taxCents,
    );
  });

  it("заказ на Кипр: два товара по 3 500 € дают ровно 7 000 € плюс доставка", () => {
    const totals = computeOrderTotals({
      lines: twoWatches,
      taxRateBp: 1900,
      shippingNetCents: 0,
    });

    expect(totals.subtotalNetCents).toBe(588236);
    expect(totals.taxCents).toBe(111764);
    expect(totals.totalCents).toBe(700000);
  });

  it("экспорт за пределы ЕС: налога нет", () => {
    const totals = computeOrderTotals({
      lines: twoWatches,
      taxRateBp: 0,
      shippingNetCents: 6500,
    });

    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(588236 + 6500);
  });

  it("товар по схеме маржи не облагается, даже когда ставка задана", () => {
    const totals = computeOrderTotals({
      lines: [
        { netUnitCents: 1150000, quantity: 1, vatScheme: "margin" },
        { netUnitCents: 294118, quantity: 1, vatScheme: "standard" },
      ],
      taxRateBp: 1900,
      shippingNetCents: 0,
    });

    expect(totals.lines[0]?.lineTaxCents).toBe(0);
    expect(totals.lines[1]?.lineTaxCents).toBe(55882);
    expect(totals.taxCents).toBe(55882);
  });

  it("налог на доставку считается по основной ставке заказа", () => {
    const totals = computeOrderTotals({
      lines: [],
      taxRateBp: 1900,
      shippingNetCents: 2500,
    });

    expect(totals.shippingTaxCents).toBe(475);
    expect(totals.totalCents).toBe(2975);
  });

  it("не теряет центы на большом количестве позиций", () => {
    const totals = computeOrderTotals({
      lines: Array.from({ length: 7 }, () => ({
        netUnitCents: 991597,
        quantity: 1,
        vatScheme: "standard" as const,
      })),
      taxRateBp: 1900,
      shippingNetCents: 0,
    });

    // 7 × 11 800 € ровно, без накопленной погрешности округления
    expect(totals.totalCents).toBe(7 * 1180000);
  });
});

describe("правила способов оплаты", () => {
  it("карта недоступна выше лимита", () => {
    expect(methodAllowedForAmount("card", CARD_LIMIT_CENTS)).toBe(true);
    expect(methodAllowedForAmount("card", CARD_LIMIT_CENTS + 1)).toBe(false);
  });

  it("перевод и крипта лимитом не ограничены", () => {
    expect(methodAllowedForAmount("bank_transfer", 5_000_000)).toBe(true);
    expect(methodAllowedForAmount("crypto", 5_000_000)).toBe(true);
  });

  it("подключён только банковский перевод", () => {
    // Карты и крипта ждут выбора провайдера — выдумывать их API нельзя.
    expect(isMethodAvailable("bank_transfer")).toBe(true);
    expect(isMethodAvailable("card")).toBe(false);
    expect(isMethodAvailable("crypto")).toBe(false);
  });
});
