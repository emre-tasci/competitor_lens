import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
  id: string;
  name: string;
  categoryName: string;
  availableCount: number;
  totalExchanges: number;
  screenshotCount: number;
}

export function FeatureCard({
  id,
  name,
  categoryName,
  availableCount,
  totalExchanges,
  screenshotCount,
}: FeatureCardProps) {
  return (
    <Link href={`/features/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
            <span>
              {availableCount}/{totalExchanges} borsa
            </span>
          </div>
          {screenshotCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {screenshotCount} screenshot
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
