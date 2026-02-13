import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ exchanges: [], features: [] });
  }

  const [exchanges, features] = await Promise.all([
    prisma.exchange.findMany({
      where: {
        exchangeFeatures: { some: {} },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, marketType: true },
      take: 5,
    }),
    prisma.feature.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, category: { select: { name: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({ exchanges, features });
}
