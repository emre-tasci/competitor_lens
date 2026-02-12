import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ImageIcon, CheckCircle } from "lucide-react";
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

export function ExchangeCard({
  id,
  name,
  marketType,
  featureCount,
  totalFeatures,
  screenshotCount,
}: ExchangeCardProps) {
  const coverage = totalFeatures > 0 ? Math.round((featureCount / totalFeatures) * 100) : 0;

  return (
    <Link href={`/exchanges/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {name}
            </CardTitle>
            <Badge variant={marketType === "turkish" ? "default" : "secondary"}>
              {marketType === "turkish" ? "TR" : "Global"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {featureCount}/{totalFeatures} özellik
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {screenshotCount}
            </span>
          </div>
          <div className="space-y-1">
            <Progress value={coverage} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{coverage}%</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
