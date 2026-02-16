import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const getCachedFeatures = unstable_cache(
  async (categoryId: string | null) => {
    const where = categoryId ? { categoryId } : {};

    return prisma.feature.findMany({
      where,
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
    });
  },
  ["api-features"],
  { revalidate: 60 }
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get("categoryId");

  const features = await getCachedFeatures(categoryId);

  return NextResponse.json(features, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, categoryId, description } = body;

  if (!name || !categoryId) {
    return NextResponse.json(
      { error: "name and categoryId are required" },
      { status: 400 }
    );
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const feature = await prisma.feature.create({
    data: { name, slug, categoryId, description },
    include: { category: true },
  });

  return NextResponse.json(feature, { status: 201 });
}
