import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const hasFeatureData = { exchangeFeatures: { some: {} } };

export async function GET() {
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

  return NextResponse.json({
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
  });
}
