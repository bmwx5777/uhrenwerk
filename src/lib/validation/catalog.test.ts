import { describe, expect, it } from "vitest";

import {
  catalogQueryString,
  countActiveFilters,
  parseCatalogSearchParams,
  priceRangeToCents,
} from "./catalog";
import { orderLookupSchema } from "./order-lookup";
import { emailField } from "./common";

/**
 * Разбор параметров каталога.
 *
 * Эти значения приходят из адресной строки, то есть от кого угодно.
 * Проверяем главное свойство: мусор не ломает страницу, а игнорируется.
 */
describe("параметры каталога из URL", () => {
  it("читает нормальные значения", () => {
    const params = parseCatalogSearchParams({
      brand: "rolex,omega",
      condition: "pre_owned",
      movement: "automatic,manual",
      price: "3000-7000",
      stock: "in",
      sort: "price_asc",
      page: "3",
    });

    expect(params.brand).toEqual(["rolex", "omega"]);
    expect(params.condition).toEqual(["pre_owned"]);
    expect(params.movement).toEqual(["automatic", "manual"]);
    expect(params.price).toBe("3000-7000");
    expect(params.sort).toBe("price_asc");
    expect(params.page).toBe(3);
  });

  it("отбрасывает мусор вместо падения", () => {
    const params = parseCatalogSearchParams({
      brand: "<script>alert(1)</script>",
      condition: "не-существует",
      movement: "quartz,выдумка",
      price: "дай-подешевле",
      stock: "yes",
      sort: "drop table",
      page: "-5",
    });

    expect(params.brand).toEqual([]);
    expect(params.condition).toEqual([]);
    expect(params.movement).toEqual(["quartz"]);
    expect(params.price).toBeUndefined();
    expect(params.stock).toBeUndefined();
    expect(params.sort).toBe("newest");
    expect(params.page).toBe(1);
  });

  it("берёт первое значение, если параметр повторяется", () => {
    const params = parseCatalogSearchParams({ sort: ["name", "price_desc"] });
    expect(params.sort).toBe("name");
  });

  it("ограничивает номер страницы сверху", () => {
    expect(parseCatalogSearchParams({ page: "999999" }).page).toBe(1);
  });

  it("собирает строку запроса обратно без значений по умолчанию", () => {
    const params = parseCatalogSearchParams({
      brand: "rolex",
      sort: "newest",
      page: "1",
    });

    expect(catalogQueryString(params)).toBe("brand=rolex");
    expect(catalogQueryString(params, { page: 2 })).toBe("brand=rolex&page=2");
  });

  it("считает активные фильтры для счётчика на кнопке", () => {
    const params = parseCatalogSearchParams({
      brand: "rolex,omega",
      price: "0-3000",
      stock: "in",
    });

    expect(countActiveFilters(params)).toBe(4);
  });

  it("переводит диапазон цен в центы", () => {
    expect(priceRangeToCents("3000-7000")).toEqual({
      priceMinCents: 300000,
      priceMaxCents: 700000,
    });
    // «от 12 000 €» — верхней границы нет
    expect(priceRangeToCents("12000-")).toEqual({ priceMinCents: 1200000 });
    expect(priceRangeToCents(undefined)).toEqual({});
  });
});

describe("нормализация email", () => {
  it("принимает адрес с пробелами и заглавными буквами", () => {
    const result = emailField.safeParse("  Collector@Example.COM  ");
    expect(result.success).toBe(true);
    expect(result.data).toBe("collector@example.com");
  });

  it("отклоняет не адрес", () => {
    expect(emailField.safeParse("не-email").success).toBe(false);
  });
});

describe("поиск заказа гостем", () => {
  it("принимает номер в любом регистре", () => {
    const result = orderLookupSchema.safeParse({
      orderNumber: " uw-2026-000123 ",
      email: "Buyer@Example.com",
    });

    expect(result.success).toBe(true);
    expect(result.data?.orderNumber).toBe("UW-2026-000123");
    expect(result.data?.email).toBe("buyer@example.com");
  });

  it("требует номер нужного формата", () => {
    const result = orderLookupSchema.safeParse({
      orderNumber: "12345",
      email: "buyer@example.com",
    });

    expect(result.success).toBe(false);
  });
});
