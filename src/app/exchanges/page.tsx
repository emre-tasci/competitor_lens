import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Building2 } from "lucide-react";
import { ExchangeTabs } from "@/components/ExchangeTabs";

export const revalidate = 60;

const getExchanges = unstable_cache(
  async () => {
    const [allExchanges, totalFeatures] = await Promise.all([
      prisma.exchange.findMany({
        where: { exchangeFeatures: { some: {} } },
        include: {
          _count: {
            select: {
              screenshots: true,
              exchangeFeatures: { where: { hasFeature: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.feature.count(),
    ]);

    return allExchanges.map((e) => ({
      id: e.id,
      name: e.name,
      marketType: e.marketType,
      logoUrl: e.logoUrl,
      featureCount: e._count.exchangeFeatures,
      totalFeatures,
      screenshotCount: e._count.screenshots,
    }));
  },
  ["exchanges-list"],
  { revalidate: 60 }
);

export default async function ExchangesPage() {
  const exchanges = await getExchanges();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          Borsalar
        </h1>
        <p className="text-muted-foreground mt-2">
          Takip edilen kripto para borsaları ve özellik kapsam oranları
        </p>
      </div>

      <ExchangeTabs exchanges={exchanges} />
    </div>
  );
}
