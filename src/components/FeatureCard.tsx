import React from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FeatureCardProps {
  id: string;
  name: string;
  categoryName: string;
  availableCount: number;
  totalExchanges: number;
  screenshotCount: number;
}

export const FeatureCard = React.memo(function FeatureCard({
  id,
  name,
  categoryName,
  availableCount,
  totalExchanges,
  screenshotCount,
}: FeatureCardProps) {
  const availability =
    totalExchanges > 0
      ? Math.round((availableCount / totalExchanges) * 100)
      : 0;

  return (
    <Link href={`/features/${id}`} className="group block h-full">
      <div className="card-hover flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {categoryName}
            </p>
            <h3 className="mt-1.5 text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
              {name}
            </h3>
          </div>
          <span className="figure shrink-0 text-2xl font-bold leading-none">
            {availability}
            <span className="text-sm font-semibold text-muted-foreground">%</span>
          </span>
        </div>

        <div className="mt-auto space-y-2">
          <Progress value={availability} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              {availableCount}/{totalExchanges} borsa
            </span>
            {screenshotCount > 0 && (
              <span className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                <span className="tabular-nums">{screenshotCount}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});
