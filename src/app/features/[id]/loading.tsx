import { Skeleton } from "@/components/ui/skeleton";

export default function FeatureDetailLoading() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Banner Skeleton */}
      <div className="relative rounded-2xl border bg-card overflow-hidden p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-44" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
