import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Camera } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  const availability = totalExchanges > 0 ? Math.round((availableCount / totalExchanges) * 100) : 0;

  return (
    <Link href={`/features/${id}`} className="block h-full">
      <Card className="card-hover cursor-pointer group h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 group-hover:text-primary transition-colors">
            <div className="bg-primary/10 rounded-lg p-1.5">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
            </div>
            {name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
            {screenshotCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {screenshotCount}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {availableCount}/{totalExchanges} borsa
              </span>
              <span className="font-medium">{availability}%</span>
            </div>
            <Progress value={availability} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
