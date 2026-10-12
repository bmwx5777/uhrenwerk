import { ProductGridSkeleton, Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Скелет каталога повторяет его сетку: боковая колонка фильтров и карточки.
 * Поэтому при появлении данных вёрстка не прыгает.
 */
export default function CatalogLoading() {
  return (
    <div className="container-page py-10 md:py-16">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 h-10 w-64" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-14">
        <div className="hidden flex-col gap-8 lg:flex">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-2.5 w-20" />
              <SkeletonText className="mt-4" lines={4} />
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="mt-10">
            <ProductGridSkeleton count={6} />
          </div>
        </div>
      </div>
    </div>
  );
}
