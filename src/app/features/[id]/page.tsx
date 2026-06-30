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
import { PageHeader } from "@/components/PageHeader";
import { Camera, Building2, CheckCircle } from "lucide-react";
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
      {/* Hero */}
      <PageHeader
        eyebrow={feature.category.name}
        title={feature.name}
        description={feature.description || undefined}
      />

      {/* Stat strip */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden animate-fade-in-up">
        <div className="grid grid-cols-3 divide-x divide-border">
          {[
            { label: "Var", value: available.length, icon: CheckCircle },
            { label: "Toplam Borsa", value: exchangeFeatures.length, icon: Building2 },
            { label: "Screenshot", value: featureScreenshots.length, icon: Camera },
          ].map((stat) => (
            <div key={stat.label} className="p-5 sm:p-6">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <stat.icon className="h-3.5 w-3.5" />
                {stat.label}
              </div>
              <p className="figure mt-2 text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
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
