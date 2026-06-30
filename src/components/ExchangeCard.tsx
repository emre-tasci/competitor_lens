import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, CheckCircle, ArrowRight } from "lucide-react";
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
  const coverage = totalFeatures > 0 ? Math.round((featureCount / totalFeatures) * 100) : 0;

  return (
    <Link href={`/exchanges/${id}`} className="block h-full">
      <Card className="card-hover cursor-pointer group h-full">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
            <Badge variant={marketType === "turkish" ? "default" : "secondary"} className="shrink-0">
              {marketType === "turkish" ? "TR" : "Global"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{featureCount}</span>
              <span className="text-muted-foreground">/ {totalFeatures} özellik</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{screenshotCount}</span>
              <span className="text-muted-foreground">görsel</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Kapsam</span>
              <span className="font-semibold tabular-nums">{coverage}%</span>
            </div>
            <Progress value={coverage} className="h-1.5" />
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Detayları gör
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
