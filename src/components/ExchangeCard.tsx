import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ExchangeCardProps {
  id: string;
  name: string;
  marketType: string;
  logoUrl?: string | null;
  featureCount: number;
  totalFeatures: number;
  screenshotCount: number;
}

export const ExchangeCard = React.memo(function ExchangeCard({
  id,
  name,
  marketType,
  featureCount,
  totalFeatures,
  screenshotCount,
}: ExchangeCardProps) {
  const coverage =
    totalFeatures > 0 ? Math.round((featureCount / totalFeatures) * 100) : 0;
  const isTurkish = marketType === "turkish";

  return (
    <Link href={`/exchanges/${id}`} className="group block h-full">
      <div className="card-hover flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
              {name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isTurkish ? "Türk borsası" : "Global borsa"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 text-[11px] text-muted-foreground"
          >
            {isTurkish ? "TR" : "Global"}
          </Badge>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Kapsam
              </p>
              <p className="figure mt-1 text-3xl font-bold leading-none">
                {coverage}
                <span className="text-lg font-semibold text-muted-foreground">%</span>
              </p>
            </div>
            <span className="figure text-xs text-muted-foreground">
              {featureCount}/{totalFeatures} özellik
            </span>
          </div>
          <Progress value={coverage} className="mt-3 h-1.5" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="tabular-nums">{screenshotCount}</span> görsel
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Detay
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
});
