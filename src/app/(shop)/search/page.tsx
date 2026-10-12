import { Search, SearchX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { ActiveFilters } from "@/components/catalog/active-filters";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { EmptyState } from "@/components/feedback/empty-state";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  catalogQueryString,
  parseCatalogSearchParams,
  priceRangeToCents,
} from "@/lib/validation/catalog";
import {
  listBrandsWithCounts,
  listCategoriesWithCounts,
  listProducts,
} from "@/server/services/catalog";

export const metadata: Metadata = {
  title: "Поиск",
  robots: { index: false },
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = parseCatalogSearchParams(await searchParams);
  const hasQuery = Boolean(params.q);

  const [result, brands, categories] = await Promise.all([
    hasQuery
      ? listProducts({
          search: params.q,
          brandSlugs: params.brand,
          categorySlugs: params.category,
          conditions: params.condition,
          movements: params.movement,
          inStockOnly: params.stock === "in",
          sort: params.sort,
          page: params.page,
          ...priceRangeToCents(params.price),
        })
      : Promise.resolve(null),
    listBrandsWithCounts(),
    listCategoriesWithCounts(),
  ]);

  const brandOptions = brands.filter((item) => item.productCount > 0);
  const categoryOptions = categories.filter((item) => item.productCount > 0);

  return (
    <div className="container-page py-10 md:py-16">
      <p className="eyebrow">Поиск по каталогу</p>
      <h1 className="mt-4 font-display text-headline font-medium">
        {hasQuery ? `Поиск: ${params.q}` : "Что вы ищете?"}
      </h1>

      {/* Обычная GET-форма: поиск работает и без JavaScript. */}
      <form action="/search" className="mt-8 flex max-w-xl gap-3">
        <Input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Модель, референс или бренд"
          aria-label="Поисковый запрос"
          maxLength={100}
        />
        <Button type="submit">Найти</Button>
      </form>

      {!result ? (
        <EmptyState
          className="mt-12"
          icon={Search}
          title="Введите запрос"
          description="Поиск работает по названию модели, заводскому референсу и краткому описанию. Достаточно первых букв: «subm» найдёт Submariner."
        />
      ) : result.items.length > 0 ? (
        <div className="mt-10">
          <CatalogToolbar
            params={params}
            brands={brandOptions}
            categories={categoryOptions}
            total={result.total}
            basePath="/search"
          />
          <ActiveFilters
            className="mt-6"
            params={params}
            brands={brandOptions}
            categories={categoryOptions}
            basePath="/search"
          />
          <ProductGrid className="mt-6" items={result.items} columns={4} />
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            hrefForPage={(page) =>
              `/search?${catalogQueryString(params, { page })}` as Route
            }
          />
        </div>
      ) : (
        <EmptyState
          className="mt-12"
          icon={SearchX}
          title="Ничего не нашлось"
          description="Проверьте написание или попробуйте короче — например, только название модели или бренд."
          action={
            <Button asChild variant="secondary">
              <Link href="/catalog">Открыть каталог</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
