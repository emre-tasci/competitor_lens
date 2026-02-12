import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get("categoryId");

  const where = categoryId ? { categoryId } : {};

  const features = await prisma.feature.findMany({
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

  return NextResponse.json(features);
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
