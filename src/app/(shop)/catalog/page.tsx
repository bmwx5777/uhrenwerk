import { SearchX } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { ActiveFilters } from "@/components/catalog/active-filters";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { EmptyState } from "@/components/feedback/empty-state";
import { ProductGrid } from "@/components/product/product-grid";
import { breadcrumbJsonLd } from "@/components/seo/json-ld";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  catalogQueryString,
  countActiveFilters,
  parseCatalogSearchParams,
  priceRangeToCents,
} from "@/lib/validation/catalog";
import {
  listBrandsWithCounts,
  listCategoriesWithCounts,
  listProducts,
} from "@/server/services/catalog";

/**
 * Метаданные зависят от параметров адреса, поэтому собираются функцией.
 *
 * Две вещи, которые легко сломать и трудно заметить:
 *
 * 1. Страница пагинации должна быть канонической сама себе. Если все
 *    страницы канонизировать на `/catalog`, поисковик сочтёт вторую
 *    страницу дублем первой и не станет учитывать её содержимое —
 *    товары со второй страницы останутся без внутренних ссылок.
 *
 * 2. Страница с фильтрами закрывается от индексации, но с `follow`:
 *    сочетаний фильтров бесконечно много и все они дают почти один и
 *    тот же текст, однако ссылки на товары с них обходить нужно.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/catalog">): Promise<Metadata> {
  const params = parseCatalogSearchParams(await searchParams);
  const hasFilters = countActiveFilters(params) > 0;
  const page = params.page;

  const canonical = page > 1 ? `/catalog?page=${page}` : "/catalog";
  const pageSuffix = page > 1 ? ` — страница ${page}` : "";

  return {
    title: `Механические часы${pageSuffix}`,
    description:
      "Каталог швейцарских и японских часов: новые и pre-owned модели с проверкой подлинности, гарантией 24 месяца и страховой доставкой по миру.",
    alternates: { canonical },
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const params = parseCatalogSearchParams(await searchParams);

  const [result, brands, categories] = await Promise.all([
    listProducts({
      brandSlugs: params.brand,
      categorySlugs: params.category,
      conditions: params.condition,
      movements: params.movement,
      inStockOnly: params.stock === "in",
      sort: params.sort,
      page: params.page,
      ...priceRangeToCents(params.price),
    }),
    listBrandsWithCounts(),
    listCategoriesWithCounts(),
  ]);

  const brandOptions = brands.filter((item) => item.productCount > 0);
  const categoryOptions = categories.filter((item) => item.productCount > 0);

  return (
    <div className="container-page py-10 md:py-14">
      <JsonLdScript data={breadcrumbJsonLd([{ name: "Каталог", path: "/catalog" }])} />

      <div className="border-b border-border pb-10">
        <div className="flex items-baseline gap-4">
          <span className="section-index">01</span>
          <p className="eyebrow">Коллекция</p>
        </div>
        <h1 className="mt-5 font-display text-headline font-medium">Каталог</h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
          Новые и pre-owned модели в одной сетке. Каждый экземпляр проверен часовщиком
          перед публикацией.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          {/* Панель остаётся на экране при прокрутке длинной сетки. */}
          <div className="sticky top-24">
            <FilterPanel
              params={params}
              brands={brandOptions}
              categories={categoryOptions}
              basePath="/catalog"
            />
          </div>
        </aside>

        <div>
          <CatalogToolbar
            params={params}
            brands={brandOptions}
            categories={categoryOptions}
            total={result.total}
            basePath="/catalog"
          />

          <ActiveFilters
            className="mt-6"
            params={params}
            brands={brandOptions}
            categories={categoryOptions}
            basePath="/catalog"
          />

          {result.items.length > 0 ? (
            <>
              <ProductGrid className="mt-6" items={result.items} />
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                hrefForPage={(page) =>
                  `/catalog?${catalogQueryString(params, { page })}` as Route
                }
              />
            </>
          ) : (
            <EmptyState
              className="mt-6"
              icon={SearchX}
              title="Под эти фильтры ничего нет"
              description="Попробуйте снять часть условий — например, расширить диапазон цены или добавить другой бренд."
              action={
                <Button asChild variant="secondary">
                  <Link href="/catalog">Сбросить фильтры</Link>
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
