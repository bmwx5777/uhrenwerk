import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="container-page py-10 md:py-16">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 h-10 w-48" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex gap-4 md:gap-6">
              <Skeleton className="size-24 shrink-0 md:size-32" />
              <div className="flex-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="mt-2 h-4 w-3/4" />
                <Skeleton className="mt-6 h-10 w-32" />
              </div>
            </div>
          ))}
        </div>

        <div className="card-surface p-6">
          <Skeleton className="h-2.5 w-16" />
          <SkeletonText className="mt-6" lines={3} />
          <Skeleton className="mt-8 h-13 w-full" />
        </div>
      </div>
    </div>
  );
}
