"use client";

import { X } from "lucide-react";

import {
  CONDITION_OPTIONS,
  MOVEMENT_OPTIONS,
  PRICE_RANGES,
  type CatalogSearchParams,
} from "@/lib/validation/catalog";
import { cn } from "@/lib/utils";
import type { FacetOption } from "./filter-panel";
import { useCatalogParams } from "./use-catalog-params";

type ActiveFiltersProps = {
  params: CatalogSearchParams;
  brands: FacetOption[];
  categories: FacetOption[];
  basePath: "/catalog" | "/search";
  className?: string;
};

/** Описание одного активного фильтра: что показать и что снять. */
type ActiveChip = {
  key: string;
  label: string;
  remove: () => void;
};

/**
 * Активные фильтры отдельной строкой над результатами.
 *
 * Нужны потому, что на десктопе боковая панель уходит за экран при
 * прокрутке, а на мобильном фильтры вообще спрятаны в выезжающей панели:
 * без этой строки непонятно, почему в каталоге три товара вместо десяти.
 *
 * Каждый чип снимает ровно свой фильтр — это быстрее, чем открывать
 * панель и искать там нужный флажок.
 */
export function ActiveFilters({
  params,
  brands,
  categories,
  basePath,
  className,
}: ActiveFiltersProps) {
  const { apply, toggleInList, reset, isPending } = useCatalogParams(basePath);

  const nameBySlug = (options: FacetOption[], slug: string) =>
    options.find((option) => option.slug === slug)?.name ?? slug;

  const chips: ActiveChip[] = [
    ...params.brand.map((slug) => ({
      key: `brand:${slug}`,
      label: nameBySlug(brands, slug),
      remove: () => toggleInList("brand", slug),
    })),
    ...params.category.map((slug) => ({
      key: `category:${slug}`,
      label: nameBySlug(categories, slug),
      remove: () => toggleInList("category", slug),
    })),
    ...params.condition.map((value) => ({
      key: `condition:${value}`,
      label: CONDITION_OPTIONS.find((option) => option.value === value)?.label ?? value,
      remove: () => toggleInList("condition", value),
    })),
    ...params.movement.map((value) => ({
      key: `movement:${value}`,
      label: MOVEMENT_OPTIONS.find((option) => option.value === value)?.label ?? value,
      remove: () => toggleInList("movement", value),
    })),
  ];

  if (params.price) {
    const range = PRICE_RANGES.find((item) => item.value === params.price);
    chips.push({
      key: "price",
      label: range?.label ?? params.price,
      remove: () => apply({ price: null }),
    });
  }

  if (params.stock === "in") {
    chips.push({
      key: "stock",
      label: "Только в наличии",
      remove: () => apply({ stock: null }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 transition-opacity",
        isPending && "pointer-events-none opacity-60",
        className,
      )}
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={`Убрать фильтр: ${chip.label}`}
          className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-accent bg-accent-soft px-3.5 text-sm font-medium text-accent-text transition-colors hover:border-accent-strong"
        >
          {chip.label}
          <X className="size-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      ))}

      {chips.length > 1 ? (
        <button
          type="button"
          onClick={reset}
          className="min-h-9 px-2 text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Сбросить всё
        </button>
      ) : null}
    </div>
  );
}
