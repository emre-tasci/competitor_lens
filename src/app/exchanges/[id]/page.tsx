import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/components/FeatureStatusBadge";
import { GroupedScreenshotGallery } from "@/components/GroupedScreenshotGallery";
import { Building2, Globe, ExternalLink, Camera, CheckCircle, ListChecks } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
      {/* Hero Banner */}
      <div className="relative rounded-2xl border bg-card overflow-hidden animate-fade-in-up">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/3 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 rounded-2xl p-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{exchange.name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge
                    variant={
                      exchange.marketType === "turkish" ? "default" : "secondary"
                    }
                  >
                    {exchange.marketType === "turkish" ? "Türk Borsası" : "Global Borsa"}
                  </Badge>
                </div>
              </div>
            </div>
            {exchange.websiteUrl && (
              <a
                href={exchange.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity w-fit"
              >
                <Globe className="h-4 w-4" />
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {exchange.description && (
            <p className="text-muted-foreground mt-4 max-w-2xl">{exchange.description}</p>
          )}

          {/* Mini stat cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                Aktif Özellikler
              </div>
              <p className="text-lg font-bold mt-0.5">{availableCount}</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                Toplam Özellik
              </div>
              <p className="text-lg font-bold mt-0.5">{exchangeFeatures.length}</p>
            </div>
            <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="h-3 w-3" />
                Screenshot
              </div>
              <p className="text-lg font-bold mt-0.5">{screenshots.length}</p>
            </div>
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
