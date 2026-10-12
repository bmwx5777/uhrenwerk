"use client";

import {
  CONDITION_OPTIONS,
  MOVEMENT_OPTIONS,
  PRICE_RANGES,
  countActiveFilters,
  type CatalogSearchParams,
} from "@/lib/validation/catalog";
import { cn } from "@/lib/utils";
import { useCatalogParams } from "./use-catalog-params";

/** Опция фильтра-справочника: бренд или категория. */
export type FacetOption = {
  slug: string;
  name: string;
  productCount: number;
};

type FilterPanelProps = {
  params: CatalogSearchParams;
  brands: FacetOption[];
  categories: FacetOption[];
  basePath: "/catalog" | "/search";
};

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mt-7 first:mt-0">
      <legend className="eyebrow mb-1 w-full">
        <span className="flex items-center gap-3">
          {title}
          <span className="rule-fade flex-1" aria-hidden />
        </span>
      </legend>
      <div className="-mx-2 flex flex-col">{children}</div>
    </fieldset>
  );
}

/**
 * Строка фильтра.
 *
 * Это кнопка с `aria-pressed`, а не чекбокс: визуально флажок убран,
 * и без явного состояния нажатия скринридер не смог бы сообщить,
 * включён фильтр или нет.
 *
 * Строки, а не «таблетки»: у чипов разная ширина, и колонка из них
 * выглядит рваной. Выровненный список с числами по правому краю
 * читается как панель каталога, а не как россыпь кнопок.
 *
 * Высота 44px — минимальная зона нажатия для пальца.
 */
function FilterRow({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left text-sm transition-colors duration-200",
        active
          ? "font-medium text-accent-text"
          : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {/* Штрих-индекс: короткий у выключенного, длинный и латунный у включённого. */}
      <span
        className={cn(
          "w-px shrink-0 transition-all duration-300 ease-[var(--ease-lux)]",
          active
            ? "h-4 bg-accent"
            : "h-2 bg-border-strong group-hover:h-3 group-hover:bg-border-control",
        )}
        aria-hidden
      />
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" ? (
        <span className="font-mono text-[0.6875rem] text-subtle tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Панель фильтров. Один и тот же компонент показывается в боковой колонке
 * на десктопе и внутри выезжающей панели на мобильном.
 */
export function FilterPanel({
  params,
  brands,
  categories,
  basePath,
}: FilterPanelProps) {
  const { apply, toggleInList, reset, isPending } = useCatalogParams(basePath);
  const activeCount = countActiveFilters(params);

  return (
    <div
      className={cn(
        "transition-opacity",
        isPending && "pointer-events-none opacity-60",
      )}
      aria-busy={isPending || undefined}
    >
      <div className="flex min-h-7 items-center justify-between gap-4">
        <p className="eyebrow text-foreground">Фильтры</p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Сбросить ({activeCount})
          </button>
        ) : null}
      </div>

      <div className="mt-6">
        <FilterGroup title="Бренд">
          {brands.map((brandOption) => (
            <FilterRow
              key={brandOption.slug}
              active={params.brand.includes(brandOption.slug)}
              onClick={() => toggleInList("brand", brandOption.slug)}
              label={brandOption.name}
              count={brandOption.productCount}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Категория">
          {categories.map((categoryOption) => (
            <FilterRow
              key={categoryOption.slug}
              active={params.category.includes(categoryOption.slug)}
              onClick={() => toggleInList("category", categoryOption.slug)}
              label={categoryOption.name}
              count={categoryOption.productCount}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Состояние">
          {CONDITION_OPTIONS.map((option) => (
            <FilterRow
              key={option.value}
              active={params.condition.includes(option.value)}
              onClick={() => toggleInList("condition", option.value)}
              label={option.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Механизм">
          {MOVEMENT_OPTIONS.map((option) => (
            <FilterRow
              key={option.value}
              active={params.movement.includes(option.value)}
              onClick={() => toggleInList("movement", option.value)}
              label={option.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Цена">
          {PRICE_RANGES.map((range) => (
            <FilterRow
              key={range.value}
              active={params.price === range.value}
              // Повторное нажатие по тому же диапазону снимает фильтр.
              onClick={() =>
                apply({ price: params.price === range.value ? null : range.value })
              }
              label={range.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Наличие">
          <FilterRow
            active={params.stock === "in"}
            onClick={() => apply({ stock: params.stock === "in" ? null : "in" })}
            label="Только в наличии"
          />
        </FilterGroup>
      </div>
    </div>
  );
}
