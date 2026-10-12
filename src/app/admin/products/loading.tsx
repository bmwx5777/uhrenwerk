import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsLoading() {
  return (
    <div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-6 h-12 w-full max-w-md" />
      <div className="card-surface mt-10">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border p-3 last:border-b-0"
          >
            <Skeleton className="size-10 shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
