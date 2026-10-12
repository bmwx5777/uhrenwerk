"use client";

import { SlidersHorizontal } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  SORT_OPTIONS,
  countActiveFilters,
  type CatalogSearchParams,
  type SortOption,
} from "@/lib/validation/catalog";
import { FilterPanel, type FacetOption } from "./filter-panel";
import { useCatalogParams } from "./use-catalog-params";

type CatalogToolbarProps = {
  params: CatalogSearchParams;
  brands: FacetOption[];
  categories: FacetOption[];
  total: number;
  basePath: "/catalog" | "/search";
};

function productCountLabel(total: number): string {
  const lastTwo = total % 100;
  const last = total % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${total} моделей`;
  if (last === 1) return `${total} модель`;
  if (last >= 2 && last <= 4) return `${total} модели`;
  return `${total} моделей`;
}

/**
 * Строка над сеткой: количество результатов, сортировка и кнопка фильтров
 * для мобильных. Сортировка — нативный `<select>`: на телефоне он открывает
 * системный список, с которым работать удобнее любого кастомного дропдауна.
 */
export function CatalogToolbar({
  params,
  brands,
  categories,
  total,
  basePath,
}: CatalogToolbarProps) {
  const { apply } = useCatalogParams(basePath);
  const activeCount = countActiveFilters(params);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="font-display text-lg leading-none font-medium">{total}</span>
        <span className="text-muted">
          {productCountLabel(total).replace(`${total} `, "")}
        </span>
      </p>

      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger className="flex h-10 items-center gap-2 rounded-md border border-border-control px-4 text-sm font-medium lg:hidden">
            <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
            Фильтры
            {activeCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-inverse text-[0.625rem] font-semibold text-inverse-foreground">
                {activeCount}
              </span>
            ) : null}
          </SheetTrigger>
          <SheetContent title="Фильтры" side="bottom">
            <FilterPanel
              params={params}
              brands={brands}
              categories={categories}
              basePath={basePath}
            />
          </SheetContent>
        </Sheet>

        <label className="flex items-center gap-2.5 text-sm">
          <span className="eyebrow sr-only sm:not-sr-only">Сортировка</span>
          <select
            value={params.sort}
            onChange={(event) => apply({ sort: event.target.value as SortOption })}
            className="h-10 rounded-sm border border-border-control bg-transparent px-3 text-sm transition-colors hover:border-border-hover"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
