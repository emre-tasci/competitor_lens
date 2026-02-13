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
    <Link href={`/exchanges/${id}`} className="block h-full">
      <Card className="card-hover cursor-pointer group h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
              <div className="bg-primary/10 rounded-lg p-1.5">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              {name}
            </CardTitle>
            <Badge variant={marketType === "turkish" ? "default" : "secondary"}>
              {marketType === "turkish" ? "TR" : "Global"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                Özellikler
              </div>
              <p className="text-sm font-semibold mt-0.5">{featureCount}/{totalFeatures}</p>
            </div>
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                Screenshot
              </div>
              <p className="text-sm font-semibold mt-0.5">{screenshotCount}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Kapsam</span>
              <span className="font-medium">{coverage}%</span>
            </div>
            <Progress value={coverage} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
