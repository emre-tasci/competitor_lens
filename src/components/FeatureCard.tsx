import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const availability = totalExchanges > 0 ? Math.round((availableCount / totalExchanges) * 100) : 0;

  return (
    <Link href={`/features/${id}`} className="block h-full">
      <Card className="card-hover cursor-pointer group h-full">
        <CardHeader className="pb-0">
          <Badge variant="outline" className="text-xs text-muted-foreground mb-2">
            {categoryName}
          </Badge>
          <CardTitle className="text-base font-semibold tracking-tight leading-snug group-hover:text-primary transition-colors">
            {name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground tabular-nums">
                {availableCount}/{totalExchanges} borsa destekliyor
              </span>
              <span className="font-semibold tabular-nums">{availability}%</span>
            </div>
            <Progress value={availability} className="h-1.5" />
          </div>
          {screenshotCount > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Camera className="h-3 w-3" />
              {screenshotCount} görsel
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});
