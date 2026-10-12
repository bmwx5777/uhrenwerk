import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { cache } from "react";

import { DISPLAY_VAT_RATE_BP } from "@/lib/constants/tax";
import type { VatScheme } from "@/lib/pricing";
import {
  PRODUCTS_PER_PAGE,
  type ConditionOption,
  type SortOption,
} from "@/lib/validation/catalog";
import { db } from "@/server/db";
import {
  brand,
  category,
  inventory,
  product,
  productImage,
  productUnit,
} from "@/server/db/schema";
import type { ProductSpecs } from "@/server/db/schema/catalog";

/**
 * Чтение каталога. Весь SQL живёт здесь: страницы получают готовые DTO
 * и не знают ни про джойны, ни про то, как считается доступность.
 */

/**
 * Цена товара в центах (нетто).
 * Для обычного товара — своя цена, для уникальных экземпляров — минимальная
 * цена среди доступных: на витрине это «от …».
 */
const EFFECTIVE_PRICE_CENTS = sql<number>`coalesce(
  ${product.priceCents},
  (
    SELECT min(${productUnit.priceCents})
    FROM ${productUnit}
    WHERE ${productUnit.productId} = ${product.id}
      AND ${productUnit.status} = 'available'
  )
)`;

/**
 * Цена, которую видит покупатель (с НДС, кроме схемы маржи).
 * Повторяет логику `displayPriceCents` из `lib/pricing.ts` —
 * иначе фильтр по цене и сортировка расходились бы с подписями на карточках.
 */
const DISPLAY_PRICE_CENTS = sql<number>`(
  CASE WHEN ${product.vatScheme} = 'margin'
    THEN ${EFFECTIVE_PRICE_CENTS}
    -- Приведение к numeric обязательно: цена в центах × 11900 выходит
    -- за пределы int4 уже на 180 000 € (int4mul → «integer out of range»).
    ELSE round(${EFFECTIVE_PRICE_CENTS}::numeric * ${10_000 + DISPLAY_VAT_RATE_BP} / 10000)
  END
)::int`;

/** Сколько единиц можно купить прямо сейчас. */
const AVAILABLE_COUNT = sql<number>`(
  CASE WHEN ${product.kind} = 'serialized'
    THEN (
      SELECT count(*)::int
      FROM ${productUnit}
      WHERE ${productUnit.productId} = ${product.id}
        AND ${productUnit.status} = 'available'
    )
    ELSE greatest(coalesce(${inventory.quantity}, 0) - coalesce(${inventory.reserved}, 0), 0)
  END
)`;

const PRIMARY_IMAGE_URL = sql<string | null>`(
  SELECT ${productImage.url}
  FROM ${productImage}
  WHERE ${productImage.productId} = ${product.id}
    AND ${productImage.productUnitId} IS NULL
  ORDER BY ${productImage.isPrimary} DESC, ${productImage.position} ASC
  LIMIT 1
)`;

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  reference: string | null;
  kind: "stocked" | "serialized";
  condition: "new" | "unworn" | "pre_owned";
  vatScheme: VatScheme;
  priceCents: number | null;
  compareAtPriceCents: number | null;
  availableCount: number;
  imageUrl: string | null;
  brandName: string;
  brandSlug: string;
  categoryName: string;
  categorySlug: string;
  specs: ProductSpecs;
  publishedAt: Date | null;
};

export type CatalogQuery = {
  brandSlugs?: string[];
  categorySlugs?: string[];
  conditions?: ConditionOption[];
  movements?: string[];
  /** Границы в центах, в терминах витрины (с НДС). */
  priceMinCents?: number;
  priceMaxCents?: number;
  inStockOnly?: boolean;
  /** Поисковый запрос пользователя; превращается в tsquery. */
  search?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
};

export type CatalogResult = {
  items: ProductListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/**
 * Запрос пользователя → tsquery с префиксным поиском: «subm» найдёт
 * Submariner. Строка чистится от всего, кроме букв и цифр, поэтому
 * оператор tsquery нельзя подделать через ввод.
 */
function searchTerms(search: string | undefined): string[] {
  if (!search) return [];

  return (
    search
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
      .split(/\s+/)
      .map((term) => term.replace(/[.-]+$/, ""))
      .filter((term) => term.length > 0)
      // Предел на число слов: иначе запрос из сотни слов превратится
      // в сотню обращений к индексу.
      .slice(0, 8)
  );
}

function toTsQuery(search: string | undefined): string | null {
  const terms = searchTerms(search);
  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}

function buildConditions(query: CatalogQuery): {
  conditions: SQL[];
  tsQuery: string | null;
} {
  const conditions: SQL[] = [
    eq(product.status, "active"),
    isNotNull(product.publishedAt),
  ];

  if (query.brandSlugs?.length) {
    const brandMatch = or(...query.brandSlugs.map((slug) => eq(brand.slug, slug)));
    if (brandMatch) conditions.push(brandMatch);
  }

  if (query.categorySlugs?.length) {
    const categoryMatch = or(
      ...query.categorySlugs.map((slug) => eq(category.slug, slug)),
    );
    if (categoryMatch) conditions.push(categoryMatch);
  }

  if (query.conditions?.length) {
    const conditionMatch = or(
      ...query.conditions.map((value) => eq(product.condition, value)),
    );
    if (conditionMatch) conditions.push(conditionMatch);
  }

  if (query.movements?.length) {
    const movementMatch = or(
      ...query.movements.map((value) => sql`${product.specs}->>'movement' = ${value}`),
    );
    if (movementMatch) conditions.push(movementMatch);
  }

  if (typeof query.priceMinCents === "number") {
    conditions.push(sql`${DISPLAY_PRICE_CENTS} >= ${query.priceMinCents}`);
  }

  if (typeof query.priceMaxCents === "number") {
    conditions.push(sql`${DISPLAY_PRICE_CENTS} <= ${query.priceMaxCents}`);
  }

  if (query.inStockOnly) {
    conditions.push(sql`${AVAILABLE_COUNT} > 0`);
  }

  const terms = searchTerms(query.search);
  const tsQuery = toTsQuery(query.search);

  if (terms.length > 0) {
    /*
     * Каждое слово запроса должно найтись либо в текстовом индексе
     * товара, либо в названии бренда.
     *
     * Бренд проверяется отдельно, потому что `search_vector` —
     * генерируемая колонка таблицы товара, а бренд лежит в другой
     * таблице и попасть в неё не может. Без этой половины условия
     * запрос «rolex» не находил бы ничего, хотя по бренду ищут чаще
     * всего. Пословная проверка нужна для смешанных запросов вида
     * «rolex submariner»: первое слово совпадает с брендом, второе —
     * с названием модели.
     *
     * Слово ищется как начало любого слова бренда, а не всей строки:
     * иначе «seiko» не нашёл бы «Grand Seiko». Пробел приписывается
     * слева, чтобы под правило попало и первое слово, а дефис меняется
     * на пробел ради «Jaeger-LeCoultre».
     */
    for (const term of terms) {
      const termMatch = or(
        sql`${product.searchVector} @@ to_tsquery('simple', ${`${term}:*`})`,
        sql`' ' || replace(${brand.name}, '-', ' ') ILIKE ${`% ${term}%`}`,
      );
      if (termMatch) conditions.push(termMatch);
    }
  } else if (query.search?.trim()) {
    /*
     * Запрос был, но после чистки от него не осталось ни одного слова
     * («???», «...»). Это не «поиска нет» — это «совпадений нет».
     *
     * Без этой ветки условие просто не добавлялось бы, и покупатель
     * получал бы весь каталог как результат поиска по мусорной строке.
     */
    conditions.push(sql`false`);
  }

  return { conditions, tsQuery };
}

function buildOrderBy(sort: SortOption, tsQuery: string | null): SQL[] {
  // При поиске релевантность важнее выбранной сортировки по умолчанию.
  if (tsQuery && sort === "newest") {
    return [
      sql`ts_rank(${product.searchVector}, to_tsquery('simple', ${tsQuery})) DESC`,
      sql`${product.publishedAt} DESC NULLS LAST`,
    ];
  }

  switch (sort) {
    case "price_asc":
      return [sql`${DISPLAY_PRICE_CENTS} ASC NULLS LAST`];
    case "price_desc":
      return [sql`${DISPLAY_PRICE_CENTS} DESC NULLS LAST`];
    case "name":
      return [sql`${product.name} ASC`];
    case "newest":
    default:
      return [sql`${product.publishedAt} DESC NULLS LAST`];
  }
}

export async function listProducts(query: CatalogQuery = {}): Promise<CatalogResult> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = query.perPage ?? PRODUCTS_PER_PAGE;
  const { conditions, tsQuery } = buildConditions(query);
  const where = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: product.id,
        slug: product.slug,
        name: product.name,
        reference: product.reference,
        kind: product.kind,
        condition: product.condition,
        vatScheme: product.vatScheme,
        compareAtPriceCents: product.compareAtPriceCents,
        specs: product.specs,
        publishedAt: product.publishedAt,
        brandName: brand.name,
        brandSlug: brand.slug,
        categoryName: category.name,
        categorySlug: category.slug,
        priceCents: EFFECTIVE_PRICE_CENTS,
        availableCount: AVAILABLE_COUNT,
        imageUrl: PRIMARY_IMAGE_URL,
      })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .leftJoin(inventory, eq(inventory.productId, product.id))
      .where(where)
      .orderBy(...buildOrderBy(query.sort ?? "newest", tsQuery))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ value: count() })
      .from(product)
      .innerJoin(brand, eq(brand.id, product.brandId))
      .innerJoin(category, eq(category.id, product.categoryId))
      .leftJoin(inventory, eq(inventory.productId, product.id))
      .where(where),
  ]);

  const total = totalResult[0]?.value ?? 0;

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Похожие модели для страницы товара.
 *
 * Один запрос с ранжированием, а не три последовательных «сначала тот же
 * бренд, потом та же категория, потом новинки»: сортировка по булевым
 * выражениям даёт ту же очерёдность за одно обращение к базе.
 *
 * Сам товар исключается — иначе он занял бы первое место в собственной
 * подборке как самый похожий на себя.
 */
export async function getRelatedProducts(
  current: { id: string; brandId: string; categoryId: string },
  limit = 4,
): Promise<ProductListItem[]> {
  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      reference: product.reference,
      kind: product.kind,
      condition: product.condition,
      vatScheme: product.vatScheme,
      compareAtPriceCents: product.compareAtPriceCents,
      specs: product.specs,
      publishedAt: product.publishedAt,
      brandName: brand.name,
      brandSlug: brand.slug,
      categoryName: category.name,
      categorySlug: category.slug,
      priceCents: EFFECTIVE_PRICE_CENTS,
      availableCount: AVAILABLE_COUNT,
      imageUrl: PRIMARY_IMAGE_URL,
    })
    .from(product)
    .innerJoin(brand, eq(brand.id, product.brandId))
    .innerJoin(category, eq(category.id, product.categoryId))
    .leftJoin(inventory, eq(inventory.productId, product.id))
    .where(
      and(
        eq(product.status, "active"),
        isNotNull(product.publishedAt),
        ne(product.id, current.id),
      ),
    )
    .orderBy(
      // Та же категория важнее того же бренда: покупатель смотрит
      // дайверские часы, а не «всё этой марки».
      sql`(${product.categoryId} = ${current.categoryId}) DESC`,
      sql`(${product.brandId} = ${current.brandId}) DESC`,
      // В наличии — выше: предлагать проданное бессмысленно.
      sql`(${AVAILABLE_COUNT} > 0) DESC`,
      sql`${product.publishedAt} DESC NULLS LAST`,
    )
    .limit(limit);
}

/**
 * Адреса товаров для карты сайта.
 *
 * `updatedAt`, а не `publishedAt`: по дате публикации поисковик не узнал
 * бы об изменении цены или описания и не стал бы переобходить страницу.
 */
export async function listProductsForSitemap(limit = 10_000) {
  return db
    .select({ slug: product.slug, updatedAt: product.updatedAt })
    .from(product)
    .where(and(eq(product.status, "active"), isNotNull(product.publishedAt)))
    .orderBy(desc(product.updatedAt))
    .limit(limit);
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/**
 * Карточка товара: модель, бренд, фото, доступные экземпляры и склад.
 *
 * Обёрнуто в `cache()`: generateMetadata и сам компонент страницы просят
 * один и тот же товар, а запрос к базе выполняется один раз за рендер.
 */
export const getProductBySlug = cache(async (slug: string) => {
  const row = await db.query.product.findFirst({
    where: and(eq(product.slug, slug), eq(product.status, "active")),
    with: {
      brand: true,
      category: true,
      images: {
        where: sql`${productImage.productUnitId} IS NULL`,
        orderBy: [desc(productImage.isPrimary), asc(productImage.position)],
      },
      units: {
        where: eq(productUnit.status, "available"),
        orderBy: [asc(productUnit.priceCents)],
        columns: {
          // costCents наружу не отдаём: это закупочная цена.
          id: true,
          unitCode: true,
          serialNumber: true,
          productionYear: true,
          conditionGrade: true,
          hasBox: true,
          hasPapers: true,
          warrantyMonths: true,
          priceCents: true,
          vatScheme: true,
        },
      },
      inventory: {
        columns: { quantity: true, reserved: true, allowBackorder: true },
      },
    },
  });

  if (!row) return null;

  const availableCount =
    row.kind === "serialized"
      ? row.units.length
      : Math.max((row.inventory?.quantity ?? 0) - (row.inventory?.reserved ?? 0), 0);

  return { ...row, availableCount };
});

/** Бренды с числом активных товаров — для панели фильтров и страницы брендов. */
export const listBrandsWithCounts = cache(async () => {
  return db
    .select({
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      countryCode: brand.countryCode,
      foundedYear: brand.foundedYear,
      description: brand.description,
      productCount: count(product.id),
    })
    .from(brand)
    .leftJoin(product, and(eq(product.brandId, brand.id), eq(product.status, "active")))
    .groupBy(brand.id)
    .orderBy(asc(brand.position), asc(brand.name));
});

export const getBrandBySlug = cache(async (slug: string) =>
  db.query.brand.findFirst({ where: eq(brand.slug, slug) }),
);

/** Категории с числом активных товаров. */
export async function listCategoriesWithCounts() {
  return db
    .select({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      productCount: count(product.id),
    })
    .from(category)
    .leftJoin(
      product,
      and(eq(product.categoryId, category.id), eq(product.status, "active")),
    )
    .where(eq(category.isActive, true))
    .groupBy(category.id)
    .orderBy(asc(category.position), asc(category.name));
}

/** Новые поступления для главной. */
export async function getNewArrivals(limit = 4): Promise<ProductListItem[]> {
  const result = await listProducts({ sort: "newest", perPage: limit, page: 1 });
  return result.items;
}
