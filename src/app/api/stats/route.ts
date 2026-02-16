import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const hasFeatureData = { exchangeFeatures: { some: {} } };

const getCachedStats = unstable_cache(
  async () => {
    const [
      totalExchanges,
      turkishExchanges,
      globalExchanges,
      totalFeatures,
      totalScreenshots,
      classifiedScreenshots,
      pendingUpdates,
      totalCells,
      availableCells,
    ] = await Promise.all([
      prisma.exchange.count({ where: hasFeatureData }),
      prisma.exchange.count({ where: { marketType: "turkish", ...hasFeatureData } }),
      prisma.exchange.count({ where: { marketType: "global", ...hasFeatureData } }),
      prisma.feature.count(),
      prisma.screenshot.count(),
      prisma.screenshot.count({ where: { featureId: { not: null } } }),
      prisma.featureUpdateSuggestion.count({ where: { status: "pending" } }),
      prisma.exchangeFeature.count(),
      prisma.exchangeFeature.count({ where: { hasFeature: true } }),
    ]);

    const maxCells = totalExchanges * totalFeatures;
    const coveragePercentage = maxCells > 0
      ? Math.round((totalCells / maxCells) * 100)
      : 0;

    return {
      totalExchanges,
      turkishExchanges,
      globalExchanges,
      totalFeatures,
      totalScreenshots,
      classifiedScreenshots,
      unclassifiedScreenshots: totalScreenshots - classifiedScreenshots,
      pendingUpdates,
      coveragePercentage,
      availableFeatures: availableCells,
      totalCells,
    };
  },
  ["api-stats"],
  { revalidate: 60 }
);

export async function GET() {
  const data = await getCachedStats();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
