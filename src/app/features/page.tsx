import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { ListChecks } from "lucide-react";
import { FeatureAccordion } from "@/components/FeatureAccordion";

export const revalidate = 60;

const getFeaturesData = unstable_cache(
  async () => {
    const [features, totalExchanges] = await Promise.all([
      prisma.feature.findMany({
        include: {
          category: true,
          _count: {
            select: {
              exchangeFeatures: { where: { hasFeature: true } },
              screenshots: true,
            },
          },
        },
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      }),
      prisma.exchange.count({ where: { exchangeFeatures: { some: {} } } }),
    ]);

    // Group by category
    const byCategory: Record<string, { name: string; features: typeof features }> = {};
    for (const f of features) {
      const catName = f.category.name;
      if (!byCategory[catName]) {
        byCategory[catName] = { name: catName, features: [] };
      }
      byCategory[catName].features.push(f);
    }

    const categories = Object.values(byCategory).map((cat) => ({
      name: cat.name,
      features: cat.features.map((f) => ({
        id: f.id,
        name: f.name,
        categoryName: f.category.name,
        availableCount: f._count.exchangeFeatures,
        totalExchanges,
        screenshotCount: f._count.screenshots,
      })),
    }));

    return { totalCount: features.length, categories };
  },
  ["features-list"],
  { revalidate: 60 }
);

export default async function FeaturesPage() {
  const { totalCount, categories } = await getFeaturesData();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-2.5">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
            Özellikler
          </h1>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {totalCount} özellik
          </Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          Tüm borsalarda izlenen özellikler ve kapsam durumları
        </p>
      </div>

      <FeatureAccordion categories={categories} />
    </div>
  );
}
