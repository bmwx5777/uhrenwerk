import { discountPercent, formatDisplayPrice, type VatScheme } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type PriceProps = {
  netCents: number | null;
  vatScheme: VatScheme;
  compareAtNetCents?: number | null;
  /** Показать «от» — когда у модели несколько экземпляров с разными ценами. */
  from?: boolean;
  size?: "sm" | "lg";
  /** Пояснение про НДС. Нужно на странице товара, на карточке — лишний шум. */
  showTaxNote?: boolean;
  className?: string;
};

/**
 * Цена на витрине.
 *
 * В базе хранится нетто; здесь считается то, что видит покупатель.
 * Это единственное место, которое превращает нетто в цену на экране —
 * и ровно та же формула повторена в SQL для фильтра и сортировки.
 */
export function Price({
  netCents,
  vatScheme,
  compareAtNetCents = null,
  from = false,
  size = "sm",
  showTaxNote = false,
  className,
}: PriceProps) {
  if (netCents === null) {
    return <p className={cn("text-sm text-muted", className)}>Цена по запросу</p>;
  }

  const discount = discountPercent(netCents, compareAtNetCents);

  return (
    <div className={className}>
      <p
        className={cn(
          "flex flex-wrap items-baseline gap-x-3 gap-y-1",
          // Крупная цена набирается антиквой: это главное число на
          // странице, и засечки придают ему вес витрины, а не отчёта.
          size === "lg" ? "font-display text-4xl font-medium" : "text-sm",
        )}
      >
        {from ? (
          <span className="font-sans text-[0.6875rem] tracking-[0.2em] text-subtle uppercase">
            от
          </span>
        ) : null}

        <span>{formatDisplayPrice(netCents, vatScheme)}</span>

        {compareAtNetCents && discount ? (
          <>
            <span className="font-sans text-sm text-subtle line-through">
              {formatDisplayPrice(compareAtNetCents, vatScheme)}
            </span>
            <span className="font-sans text-[0.6875rem] tracking-[0.12em] text-accent-text">
              −{discount}%
            </span>
          </>
        ) : null}
      </p>

      {showTaxNote ? (
        <p className="mt-2 text-xs leading-relaxed text-subtle">
          {vatScheme === "margin"
            ? "Товар продаётся по схеме налогообложения маржи: НДС в счёте не выделяется."
            : "Цена указана с НДС 19 %."}{" "}
          Для доставки за пределы ЕС налог пересчитывается при оформлении заказа.
        </p>
      ) : null}
    </div>
  );
}
