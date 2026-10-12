import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div>
      <Skeleton className="h-2.5 w-32" />
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="card-surface p-5">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Skeleton className="size-12" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
