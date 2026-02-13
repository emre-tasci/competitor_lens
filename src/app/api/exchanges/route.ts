import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketType = searchParams.get("marketType");

  const where = {
    ...(marketType ? { marketType } : {}),
    exchangeFeatures: { some: {} },
  };

  const exchanges = await prisma.exchange.findMany({
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
  });

  // Get total features count for coverage calculation
  const totalFeatures = await prisma.feature.count();

  const result = exchanges.map((e) => ({
    ...e,
    featureCount: e._count.exchangeFeatures,
    totalFeatures,
  }));

  return NextResponse.json(result);
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
