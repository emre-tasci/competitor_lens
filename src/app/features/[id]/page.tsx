import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeatureStatusBadge } from "@/components/FeatureStatusBadge";
import { GroupedScreenshotGallery } from "@/components/GroupedScreenshotGallery";
import { ListChecks, Camera, Building2, CheckCircle } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [feature, exchangeFeatures, featureScreenshots] = await Promise.all([
    prisma.feature.findUnique({
      where: { id },
      include: { category: true },
    }),
    prisma.exchangeFeature.findMany({
      where: { featureId: id },
      include: { exchange: true },
      orderBy: { exchange: { name: "asc" } },
    }),
    prisma.screenshot.findMany({
      where: { featureId: id },
      include: { exchange: true, category: true },
      orderBy: [{ exchange: { name: "asc" } }, { uploadedAt: "desc" }],
    }),
  ]);

  if (!feature) notFound();

  const available = exchangeFeatures.filter((ef) => ef.hasFeature);

  // Group screenshots by exchange
  const screenshotsByExchange: Record<
    string,
    {
      exchangeName: string;
      marketType: string;
      screenshots: typeof featureScreenshots;
    }
  > = {};

  for (const ss of featureScreenshots) {
    if (ss.exchange) {
      const key = ss.exchange.id;
      if (!screenshotsByExchange[key]) {
        screenshotsByExchange[key] = {
          exchangeName: ss.exchange.name,
          marketType: ss.exchange.marketType,
          screenshots: [],
        };
      }
      screenshotsByExchange[key].screenshots.push(ss);
    }
  }

  const sortedGroups = Object.entries(screenshotsByExchange).sort(
    ([, a], [, b]) => a.exchangeName.localeCompare(b.exchangeName)
  );

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-2xl border bg-card overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/3 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 rounded-2xl p-4">
              <ListChecks className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{feature.name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline">{feature.category.name}</Badge>
              </div>
            </div>
          </div>

          {feature.description && (
            <p className="text-muted-foreground mt-4 max-w-2xl">{feature.description}</p>
          )}

          {/* Mini stat cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                Var
              </div>
              <p className="text-lg font-bold mt-0.5">{available.length}</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Toplam Borsa
              </div>
              <p className="text-lg font-bold mt-0.5">{exchangeFeatures.length}</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="h-3 w-3" />
                Screenshot
              </div>
              <p className="text-lg font-bold mt-0.5">{featureScreenshots.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Status Table */}
      <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Hangi Borsalarda Var?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exchangeFeatures.length === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz veri yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borsa</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Screenshot</TableHead>
                  <TableHead>Not</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeFeatures.map((ef) => {
                  const ssCount =
                    screenshotsByExchange[ef.exchange.id]?.screenshots.length ||
                    0;
                  return (
                    <TableRow key={ef.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell>
                        <Link
                          href={`/exchanges/${ef.exchange.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {ef.exchange.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ef.exchange.marketType === "turkish"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {ef.exchange.marketType === "turkish"
                            ? "TR"
                            : "Global"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <FeatureStatusBadge status={ef.featureStatus} />
                      </TableCell>
                      <TableCell>
                        {ssCount > 0 ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            {ssCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {ef.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Screenshots grouped by Exchange */}
      <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5 text-muted-foreground" />
          Screenshotlar
          <Badge variant="secondary" className="text-xs">
            {featureScreenshots.length}
          </Badge>
        </h2>

        <GroupedScreenshotGallery
          groups={sortedGroups.map(([id, group]) => ({
            id,
            title: group.exchangeName,
            subtitle:
              group.marketType === "turkish" ? "TR" : "Global",
            screenshots: group.screenshots,
          }))}
          unclassified={[]}
          showExchangeName
        />
      </div>
    </div>
  );
}
