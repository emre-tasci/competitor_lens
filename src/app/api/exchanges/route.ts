import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const getCachedExchanges = unstable_cache(
  async (marketType: string | null) => {
    const where = {
      ...(marketType ? { marketType } : {}),
      exchangeFeatures: { some: {} },
    };

    const [exchanges, totalFeatures] = await Promise.all([
      prisma.exchange.findMany({
        where,
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

    return exchanges.map((e) => ({
      ...e,
      featureCount: e._count.exchangeFeatures,
      totalFeatures,
    }));
  },
  ["api-exchanges"],
  { revalidate: 60 }
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketType = searchParams.get("marketType");

  const result = await getCachedExchanges(marketType);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, marketType, websiteUrl, logoUrl, description } = body;

  if (!name || !marketType) {
    return NextResponse.json(
      { error: "name and marketType are required" },
      { status: 400 }
    );
  }

  const exchange = await prisma.exchange.create({
    data: { name, marketType, websiteUrl, logoUrl, description },
  });

  return NextResponse.json(exchange, { status: 201 });
}
