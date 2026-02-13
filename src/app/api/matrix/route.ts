import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const marketType = searchParams.get("marketType");

  const exchangeWhere = marketType ? { marketType } : {};

  const [allExchanges, categories, cells, lastLog] = await Promise.all([
    prisma.exchange.findMany({
      where: exchangeWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true, marketType: true, _count: { select: { exchangeFeatures: true } } },
    }),
    prisma.featureCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        features: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.exchangeFeature.findMany({
      where: marketType
        ? { exchange: { marketType } }
        : {},
      select: {
        exchangeId: true,
        featureId: true,
        hasFeature: true,
        featureStatus: true,
        notes: true,
      },
    }),
    prisma.featureUpdateLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // Only include exchanges that have feature data
  const exchanges = allExchanges
    .filter((e) => e._count.exchangeFeatures > 0)
    .map(({ _count, ...rest }) => rest);

  // Build cell map: cells[exchangeId][featureId]
  const cellMap: Record<string, Record<string, typeof cells[0]>> = {};
  for (const cell of cells) {
    if (!cellMap[cell.exchangeId]) cellMap[cell.exchangeId] = {};
    cellMap[cell.exchangeId][cell.featureId] = cell;
  }

  return NextResponse.json({
    exchanges,
    categories,
    cells: cellMap,
    lastUpdated: lastLog?.createdAt?.toISOString() || null,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { exchangeId, featureId, hasFeature, featureStatus, notes } = body;

  if (!exchangeId || !featureId) {
    return NextResponse.json(
      { error: "exchangeId and featureId are required" },
      { status: 400 }
    );
  }

  const cell = await prisma.exchangeFeature.upsert({
    where: {
      exchangeId_featureId: { exchangeId, featureId },
    },
    update: {
      hasFeature: hasFeature ?? undefined,
      featureStatus: featureStatus ?? undefined,
      notes: notes ?? undefined,
    },
    create: {
      exchangeId,
      featureId,
      hasFeature: hasFeature ?? false,
      featureStatus: featureStatus ?? "unknown",
      notes,
    },
  });

  return NextResponse.json(cell);
}
