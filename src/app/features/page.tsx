import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { FeatureAccordion } from "@/components/FeatureAccordion";
import { PageHeader } from "@/components/PageHeader";

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
      prisma.exchange.count(),
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
    <div className="space-y-8">
      <PageHeader
        title="Özellikler"
        description="Sektörde takip ettiğiniz özellikler ve bunları sunan borsaların oranı."
        action={
          <Badge variant="outline" className="figure px-3 py-1 text-sm text-muted-foreground">
            {totalCount} özellik
          </Badge>
        }
      />

      <FeatureAccordion categories={categories} />
    </div>
  );
}
