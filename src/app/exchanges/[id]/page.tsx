import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FeatureStatusBadge } from "@/components/FeatureStatusBadge";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { Building2, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExchangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exchange = await prisma.exchange.findUnique({
    where: { id },
    include: {
      screenshots: {
        include: { feature: true, category: true },
        orderBy: { uploadedAt: "desc" },
      },
      exchangeFeatures: {
        include: {
          feature: { include: { category: true } },
        },
        orderBy: { feature: { sortOrder: "asc" } },
      },
    },
  });

  if (!exchange) notFound();

  // Group features by category
  const featuresByCategory: Record<
    string,
    { categoryName: string; features: typeof exchange.exchangeFeatures }
  > = {};

  for (const ef of exchange.exchangeFeatures) {
    const catName = ef.feature.category.name;
    if (!featuresByCategory[catName]) {
      featuresByCategory[catName] = { categoryName: catName, features: [] };
    }
    featuresByCategory[catName].features.push(ef);
  }

  const availableCount = exchange.exchangeFeatures.filter(
    (ef) => ef.hasFeature
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{exchange.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  exchange.marketType === "turkish" ? "default" : "secondary"
                }
              >
                {exchange.marketType === "turkish" ? "TR" : "Global"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {availableCount}/{exchange.exchangeFeatures.length} özellik
              </span>
            </div>
          </div>
        </div>
        {exchange.websiteUrl && (
          <a
            href={exchange.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Globe className="h-4 w-4" />
            Website
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {exchange.description && (
        <p className="text-muted-foreground">{exchange.description}</p>
      )}

      <Separator />

      {/* Features by Category */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Özellikler</h2>
        {Object.entries(featuresByCategory).length === 0 ? (
          <p className="text-muted-foreground">
            Henüz özellik verisi yok. Excel import ile ekleyin.
          </p>
        ) : (
          Object.entries(featuresByCategory).map(
            ([key, { categoryName, features }]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{categoryName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {features.map((ef) => (
                      <Link
                        key={ef.id}
                        href={`/features/${ef.feature.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
                      >
                        <span className="text-sm">{ef.feature.name}</span>
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

      <Separator />

      {/* Screenshot Gallery */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Screenshotlar ({exchange.screenshots.length})
        </h2>
        <ScreenshotGallery screenshots={exchange.screenshots} />
      </div>
    </div>
  );
}
