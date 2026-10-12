import type { ProductListItem } from "@/server/services/catalog";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  items: ProductListItem[];
  /** Число колонок на широком экране: 3 — для страниц с фильтрами, 4 — для витрины. */
  columns?: 3 | 4;
  className?: string;
};

export function ProductGrid({ items, columns = 3, className }: ProductGridProps) {
  return (
    <div
      className={cn(
        "grid gap-8 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <ProductCard key={item.id} item={item} />
      ))}
    </div>
  );
}
