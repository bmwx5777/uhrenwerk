import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="container-page py-10 md:py-16">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-5 h-10 w-full max-w-md" />
      <Skeleton className="mt-8 h-12 w-full max-w-xl" />
      <div className="mt-12">
        <ProductGridSkeleton count={4} />
      </div>
    </div>
  );
}
