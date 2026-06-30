import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/FeatureStatusBadge";
import { GroupedScreenshotGallery } from "@/components/GroupedScreenshotGallery";
import { Globe, ExternalLink, Camera, CheckCircle, ListChecks, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function ExchangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [exchange, exchangeFeatures, screenshots] = await Promise.all([
    prisma.exchange.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        marketType: true,
        logoUrl: true,
        websiteUrl: true,
        description: true,
      },
    }),
    prisma.exchangeFeature.findMany({
      where: { exchangeId: id },
      include: {
        feature: { include: { category: true } },
      },
      orderBy: { feature: { sortOrder: "asc" } },
    }),
    prisma.screenshot.findMany({
      where: { exchangeId: id },
      include: { feature: { include: { category: true } }, category: true },
      orderBy: [{ feature: { sortOrder: "asc" } }, { uploadedAt: "desc" }],
    }),
  ]);

  if (!exchange) notFound();

  // Group features by category
  const featuresByCategory: Record<
    string,
    { categoryName: string; features: typeof exchangeFeatures }
  > = {};

  for (const ef of exchangeFeatures) {
    const catName = ef.feature.category.name;
    if (!featuresByCategory[catName]) {
      featuresByCategory[catName] = { categoryName: catName, features: [] };
    }
    featuresByCategory[catName].features.push(ef);
  }

  const availableCount = exchangeFeatures.filter(
    (ef) => ef.hasFeature
  ).length;

  // Group screenshots by feature
  const screenshotsByFeature: Record<
    string,
    {
      featureName: string;
      categoryName: string;
      screenshots: typeof screenshots;
    }
  > = {};
  const unclassifiedScreenshots: typeof screenshots = [];

  for (const ss of screenshots) {
    if (ss.feature) {
      const key = ss.feature.id;
      if (!screenshotsByFeature[key]) {
        screenshotsByFeature[key] = {
          featureName: ss.feature.name,
          categoryName: ss.feature.category?.name || "Diğer",
          screenshots: [],
        };
      }
      screenshotsByFeature[key].screenshots.push(ss);
    } else {
      unclassifiedScreenshots.push(ss);
    }
  }

  const sortedGroups = Object.entries(screenshotsByFeature).sort(
    ([, a], [, b]) =>
      a.categoryName.localeCompare(b.categoryName) ||
      a.featureName.localeCompare(b.featureName)
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/exchanges"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in-up"
      >
        <ArrowLeft className="h-4 w-4" />
        Borsalar
      </Link>

      {/* Hero */}
      <div className="animate-fade-in-up space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <Badge
              variant={exchange.marketType === "turkish" ? "default" : "secondary"}
            >
              {exchange.marketType === "turkish" ? "Türk Borsası" : "Global Borsa"}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{exchange.name}</h1>
            {exchange.description && (
              <p className="text-muted-foreground max-w-2xl leading-relaxed">{exchange.description}</p>
            )}
          </div>
          {exchange.websiteUrl && (
            <a
              href={exchange.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit shrink-0"
            >
              <Globe className="h-4 w-4" />
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Stat strip */}
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { label: "Aktif Özellikler", value: availableCount, icon: CheckCircle },
              { label: "Toplam Özellik", value: exchangeFeatures.length, icon: ListChecks },
              { label: "Screenshot", value: screenshots.length, icon: Camera },
            ].map((stat) => (
              <div key={stat.label} className="p-4 sm:p-5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <stat.icon className="h-3.5 w-3.5" />
                  {stat.label}
                </div>
                <p className="text-2xl font-bold tracking-tight mt-1.5 tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features by Category */}
      <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-lg font-semibold">Özellikler</h2>
        {Object.entries(featuresByCategory).length === 0 ? (
          <p className="text-muted-foreground">Henüz özellik verisi yok.</p>
        ) : (
          Object.entries(featuresByCategory).map(
            ([key, { categoryName, features }]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="bg-primary/10 rounded-lg p-1">
                      <ListChecks className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {categoryName}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {features.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {features.map((ef) => (
                      <Link
                        key={ef.id}
                        href={`/features/${ef.feature.id}`}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <span className="text-sm group-hover:text-primary transition-colors">
                          {ef.feature.name}
                        </span>
                        <FeatureStatusBadge status={ef.featureStatus} />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )
        )}
      </div>

      {/* Screenshots grouped by Feature */}
      <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5 text-muted-foreground" />
          Screenshotlar
          <Badge variant="secondary" className="text-xs">
            {screenshots.length}
          </Badge>
        </h2>

        <GroupedScreenshotGallery
          groups={sortedGroups.map(([id, group]) => ({
            id,
            title: group.featureName,
            subtitle: group.categoryName,
            screenshots: group.screenshots,
          }))}
          unclassified={unclassifiedScreenshots}
        />
      </div>
    </div>
  );
}
