import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { ExchangeTabs } from "@/components/ExchangeTabs";
import { PageHeader } from "@/components/PageHeader";

export const revalidate = 60;

const getExchanges = unstable_cache(
  async () => {
    const [allExchanges, totalFeatures] = await Promise.all([
      prisma.exchange.findMany({
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
    <div className="space-y-8">
      <PageHeader
        title="Borsalar"
        description="İzlediğiniz borsalar ve sundukları özellikler - kim neyi sunuyor, bir bakışta görün."
      />

      <ExchangeTabs exchanges={exchanges} />
    </div>
  );
}
