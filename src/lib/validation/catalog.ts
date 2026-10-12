import { z } from "zod";

/**
 * Разбор параметров каталога из URL.
 *
 * Главное правило: у каждого поля есть `.catch()` с безопасным значением.
 * Испорченная или подделанная строка запроса (`?page=-5&sort=drop`) не должна
 * ронять страницу — она просто игнорируется.
 */

export const SORT_OPTIONS = [
  { value: "newest", label: "Сначала новые" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
  { value: "name", label: "По названию" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const CONDITION_OPTIONS = [
  { value: "new", label: "Новые" },
  { value: "unworn", label: "Неношеные" },
  { value: "pre_owned", label: "Pre-owned" },
] as const;

export type ConditionOption = (typeof CONDITION_OPTIONS)[number]["value"];

export const MOVEMENT_OPTIONS = [
  { value: "automatic", label: "Автоподзавод" },
  { value: "manual", label: "Ручной завод" },
  { value: "spring_drive", label: "Spring Drive" },
  { value: "quartz", label: "Кварц" },
] as const;

export type MovementOption = (typeof MOVEMENT_OPTIONS)[number]["value"];

/** Диапазоны цен — в евро и в терминах витрины (с НДС). */
export const PRICE_RANGES = [
  { value: "0-3000", label: "до 3 000 €", min: 0, max: 3000 },
  { value: "3000-7000", label: "3 000 — 7 000 €", min: 3000, max: 7000 },
  { value: "7000-12000", label: "7 000 — 12 000 €", min: 7000, max: 12000 },
  { value: "12000-", label: "от 12 000 €", min: 12000, max: null },
] as const;

export type PriceRangeValue = (typeof PRICE_RANGES)[number]["value"];

export const PRODUCTS_PER_PAGE = 12;

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);
const CONDITION_VALUES = CONDITION_OPTIONS.map((option) => option.value);
const MOVEMENT_VALUES = MOVEMENT_OPTIONS.map((option) => option.value);
const PRICE_VALUES = PRICE_RANGES.map((range) => range.value);

/** Список через запятую → массив допустимых значений, всё лишнее отбрасывается. */
function commaSeparated<T extends string>(allowed: readonly T[]) {
  return z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part): part is T => (allowed as readonly string[]).includes(part)),
    )
    .catch([] as T[]);
}

const slugList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => /^[a-z0-9-]{1,64}$/.test(part)),
  )
  .catch([]);

export const catalogSearchSchema = z.object({
  brand: slugList,
  category: slugList,
  condition: commaSeparated(CONDITION_VALUES),
  movement: commaSeparated(MOVEMENT_VALUES),
  price: z
    .enum(PRICE_VALUES as [PriceRangeValue, ...PriceRangeValue[]])
    .optional()
    .catch(undefined),
  stock: z.literal("in").optional().catch(undefined),
  sort: z.enum(SORT_VALUES as [SortOption, ...SortOption[]]).catch("newest"),
  page: z.coerce.number().int().min(1).max(500).catch(1),
  q: z.string().trim().min(1).max(100).optional().catch(undefined),
});

export type CatalogSearchParams = z.infer<typeof catalogSearchSchema>;

/** В URL параметр может прийти массивом (`?brand=a&brand=b`) — берём первое значение. */
export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogSearchParams(
  raw: Record<string, string | string[] | undefined>,
): CatalogSearchParams {
  return catalogSearchSchema.parse({
    brand: firstValue(raw.brand),
    category: firstValue(raw.category),
    condition: firstValue(raw.condition),
    movement: firstValue(raw.movement),
    price: firstValue(raw.price),
    stock: firstValue(raw.stock),
    sort: firstValue(raw.sort),
    page: firstValue(raw.page),
    q: firstValue(raw.q),
  });
}

/**
 * Обратная сборка строки запроса из разобранных параметров.
 * Значения по умолчанию в URL не пишем — ссылки остаются короткими.
 */
export function catalogQueryString(
  params: CatalogSearchParams,
  overrides: { page?: number } = {},
): string {
  const search = new URLSearchParams();

  if (params.brand.length) search.set("brand", params.brand.join(","));
  if (params.category.length) search.set("category", params.category.join(","));
  if (params.condition.length) search.set("condition", params.condition.join(","));
  if (params.movement.length) search.set("movement", params.movement.join(","));
  if (params.price) search.set("price", params.price);
  if (params.stock) search.set("stock", params.stock);
  if (params.sort !== "newest") search.set("sort", params.sort);
  if (params.q) search.set("q", params.q);

  const page = overrides.page ?? params.page;
  if (page > 1) search.set("page", String(page));

  return search.toString();
}

/** Диапазон цен из URL → границы в центах для запроса к базе. */
export function priceRangeToCents(value: PriceRangeValue | undefined): {
  priceMinCents?: number;
  priceMaxCents?: number;
} {
  const range = PRICE_RANGES.find((item) => item.value === value);
  if (!range) return {};

  return {
    priceMinCents: range.min * 100,
    ...(range.max === null ? {} : { priceMaxCents: range.max * 100 }),
  };
}

/** Сколько фильтров активно — для счётчика на мобильной кнопке «Фильтры». */
export function countActiveFilters(params: CatalogSearchParams): number {
  return (
    params.brand.length +
    params.category.length +
    params.condition.length +
    params.movement.length +
    (params.price ? 1 : 0) +
    (params.stock ? 1 : 0)
  );
}
