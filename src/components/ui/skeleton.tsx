import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Серый прямоугольник на месте загружающегося контента.
 * Размер задаётся классами снаружи — компонент ничего не знает о раскладке.
 */
export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-raised", className)}
      {...props}
    />
  );
}

/** Несколько строк текста-заглушки; последняя короче — так выглядит живой текст. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3.5 rounded-sm", index === lines - 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}

/**
 * Скелет карточки товара. Повторяет сетку настоящей карточки
 * (квадрат изображения + три строки), чтобы при загрузке не было сдвига вёрстки.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    </div>
  );
}

/** Сетка скелетов карточек — используется в loading.tsx каталога. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
