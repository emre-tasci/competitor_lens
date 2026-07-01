import { Skeleton } from "@/components/ui/skeleton";

// Route-level loading state for the dashboard (and any child that suspends).
// Mirrors the page's shape — hero header, one metrics panel, the Gündem grid —
// so the layout doesn't shift when real data lands.
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Yükleniyor">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      {/* Metrics band — one panel, hero + medium + strip */}
      <div className="panel p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Gündem grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
