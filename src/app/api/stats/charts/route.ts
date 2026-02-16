import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const hasFeatureData = { exchangeFeatures: { some: {} } };

const getCachedCharts = unstable_cache(
  async () => {
    const [exchanges, totalFeatures, categories, allFeatures] =
      await Promise.all([
        prisma.exchange.findMany({
          where: hasFeatureData,
          include: {
            _count: {
              select: { exchangeFeatures: { where: { hasFeature: true } } },
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.feature.count(),
        prisma.featureCategory.findMany({
          include: { _count: { select: { features: true } } },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.exchangeFeature.findMany({
          where: { hasFeature: true },
          select: {
            exchangeId: true,
            feature: { select: { categoryId: true } },
          },
        }),
      ]);

    const coverage = exchanges.map((e) => ({
      name: e.name,
      marketType: e.marketType,
      count: e._count.exchangeFeatures,
      total: totalFeatures,
      percentage:
        totalFeatures > 0
          ? Math.round((e._count.exchangeFeatures / totalFeatures) * 100)
          : 0,
    }));

    const topExchanges = exchanges.slice(0, 6);

    const countMap = new Map<string, Map<string, number>>();
    for (const ef of allFeatures) {
      const catId = ef.feature.categoryId;
      let exMap = countMap.get(ef.exchangeId);
      if (!exMap) {
        exMap = new Map();
        countMap.set(ef.exchangeId, exMap);
      }
      exMap.set(catId, (exMap.get(catId) ?? 0) + 1);
    }

    const radarData = categories.map((cat) => {
      const entry: Record<string, string | number> = { category: cat.name };
      const totalInCat = cat._count.features;
      for (const ex of topExchanges) {
        const count = countMap.get(ex.id)?.get(cat.id) ?? 0;
        entry[ex.name] =
          totalInCat > 0 ? Math.round((count / totalInCat) * 100) : 0;
      }
      return entry;
    });

    return {
      coverage,
      radarData,
      exchangeNames: topExchanges.map((e) => e.name),
    };
  },
  ["api-stats-charts"],
  { revalidate: 300 }
);

export async function GET() {
  const data = await getCachedCharts();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
